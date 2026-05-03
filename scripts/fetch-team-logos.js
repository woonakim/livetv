/**
 * Wikipedia 한국어/영어 API로 누락 팀 로고 자동 수집
 * - 한글 팀명으로 위키 검색
 * - 카테고리에서 종목 검증 (DB의 sport와 일치해야 다운로드)
 * - 페이지 이미지 → public/team-logos/{팀명}.png
 * - DB logoPath 업데이트
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const https = require("https");

const p = new PrismaClient();
const LOGO_DIR = path.join(process.cwd(), "public/team-logos");

const SPORT_KEYWORDS = {
  soccer: ["축구단", "축구 클럽", "축구팀", "프르바", "프리미어 리그 구단", "분데스리가 구단", "라리가", "세리에", "축구"],
  baseball: ["야구단", "야구팀", "야구"],
  basketball: ["농구단", "농구팀", "농구"],
  hockey: ["하키", "아이스하키", "NHL", "KHL"],
  volleyball: ["배구단", "배구팀", "배구"],
};

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function httpsGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "LiveTV/1.0 (admin@livefelix.com)",
        "Accept": "application/json",
        ...headers,
      },
    }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        if (res.statusCode === 429 || body.startsWith("You are making")) {
          reject(new Error("RATE_LIMIT"));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error("JSON 파싱 실패: " + e.message));
        }
      });
    }).on("error", reject);
  });
}

async function downloadImage(url, dest) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "LiveTV-Bot/1.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // redirect
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        downloadImage(res.headers.location, dest).then(resolve);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(dest); } catch {}
        resolve(false);
        return;
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        try {
          if (fs.statSync(dest).size < 500) {
            fs.unlinkSync(dest);
            resolve(false);
          } else {
            resolve(true);
          }
        } catch {
          resolve(false);
        }
      });
    }).on("error", () => {
      file.close();
      try { fs.unlinkSync(dest); } catch {}
      resolve(false);
    });
  });
}

// 비스포츠 페이지 식별용 키워드
const NON_SPORT_HINTS = /기업|회사|상장|법인|학교|소매|브랜드|영화|드라마|음악|배우|가수|아이돌|소설|만화|게임 회사/;

// 위키 페이지에서 카테고리로 종목 검출
async function detectSport(pageTitle, lang = "ko") {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=categories&format=json&cllimit=30`;
  const data = await httpsGetJson(url);
  const pages = data.query?.pages || {};
  const categoryStrs = [];
  for (const pid in pages) {
    for (const c of pages[pid].categories || []) {
      categoryStrs.push(c.title);
    }
  }

  // 비스포츠 페이지 식별 → 즉시 거부
  for (const cat of categoryStrs) {
    if (NON_SPORT_HINTS.test(cat)) {
      // 단, 같은 카테고리에 스포츠 키워드도 함께 있으면 보류
      let hasSport = false;
      for (const keywords of Object.values(SPORT_KEYWORDS)) {
        for (const kw of keywords) {
          if (cat.includes(kw)) { hasSport = true; break; }
        }
        if (hasSport) break;
      }
      if (!hasSport) return null;
    }
  }

  // 카테고리 단위로 검사 (다른 카테고리 결합으로 인한 오매칭 방지)
  for (const cat of categoryStrs) {
    if (NON_SPORT_HINTS.test(cat)) continue;
    for (const [sport, keywords] of Object.entries(SPORT_KEYWORDS)) {
      for (const kw of keywords) {
        if (cat.includes(kw)) return sport;
      }
    }
  }
  return null;
}

// 위키 페이지의 대표 이미지 URL 가져오기
async function getPageImage(pageTitle, lang = "ko") {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&format=json&piprop=original`;
  const data = await httpsGetJson(url);
  const pages = data.query?.pages || {};
  for (const pid in pages) {
    const img = pages[pid].original?.source;
    if (img) return img;
  }
  return null;
}

// 위키 검색으로 정확한 페이지 제목 찾기
async function searchPage(query, lang = "ko") {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json`;
  const data = await httpsGetJson(url);
  // [검색어, [제목들], [설명들], [URL들]]
  return data[1] || [];
}

// 팀 핵심 단어가 페이지 제목에 들어있어야 함 (잘못된 페이지 매칭 방지)
function titleMatchesTeam(pageTitle, teamName) {
  const norm = (s) => s.replace(/\s+/g, "").toLowerCase();
  const a = norm(pageTitle);
  const b = norm(teamName);
  if (a.includes(b) || b.includes(a)) return true;
  // 공통 단어 2글자 이상 일치
  const common = teamName.split(/\s+/).filter((w) => w.length >= 2 && pageTitle.includes(w));
  return common.length >= 1;
}

async function tryLang(team, lang) {
  const { id, nameKr, sport: expectedSport } = team;
  const safeName = nameKr.replace(/[\/\\:*?<>|"]/g, "_");
  const filename = `${safeName}.png`;
  const filePath = path.join(LOGO_DIR, filename);
  const dbPath = `/team-logos/${filename}`;

  const titles = await searchPage(nameKr, lang);
  await delay(2500);
  if (titles.length === 0) return false;

  for (const title of titles) {
    if (!titleMatchesTeam(title, nameKr)) continue;

    const detectedSport = await detectSport(title, lang);
    await delay(2500);
    if (!detectedSport) continue;
    if (expectedSport && detectedSport !== expectedSport) {
      console.log(`  [종목불일치] ${nameKr}: 기대 ${expectedSport} ≠ 위키 ${detectedSport} (페이지: ${title})`);
      continue;
    }

    const imageUrl = await getPageImage(title, lang);
    await delay(2500);
    if (!imageUrl) continue;

    const ok = await downloadImage(imageUrl, filePath);
    if (ok) {
      await p.teamLogo.update({ where: { id }, data: { logoPath: dbPath, sport: detectedSport } });
      console.log(`  [성공-${lang}] ${nameKr} (${detectedSport}) → ${filename}`);
      return true;
    }
  }
  return false;
}

async function processTeam(team) {
  // 한국어 위키 우선, 안 되면 영문 위키
  try {
    if (await tryLang(team, "ko")) return true;
  } catch (e) {
    if (e.message === "RATE_LIMIT") {
      console.log(`  [RATE LIMIT] ${team.nameKr} - 30초 대기`);
      await delay(30000);
      try { if (await tryLang(team, "ko")) return true; } catch {}
    }
  }
  try {
    if (await tryLang(team, "en")) return true;
  } catch (e) {
    if (e.message === "RATE_LIMIT") {
      console.log(`  [RATE LIMIT] ${team.nameKr} - 30초 대기`);
      await delay(30000);
    }
  }
  console.log(`  [로고없음] ${team.nameKr}`);
  return false;
}

async function main() {
  const teams = await p.teamLogo.findMany({ where: { logoPath: "" } });
  console.log(`\n누락 팀 ${teams.length}개 처리 시작\n`);

  let success = 0;
  let failed = 0;
  for (const t of teams) {
    if (t.nameKr === "2026 LCK Challengers") {
      console.log(`  [스킵] ${t.nameKr} (e스포츠)`);
      continue;
    }
    try {
      const ok = await processTeam(t);
      if (ok) success++;
      else failed++;
    } catch (e) {
      console.log(`  [에러] ${t.nameKr}: ${e.message}`);
      failed++;
    }
    await delay(3000); // 위키 API rate limit 회피
  }

  console.log(`\n완료: 성공 ${success}, 실패 ${failed}`);
  process.exit();
}

main();
