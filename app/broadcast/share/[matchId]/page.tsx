import { Metadata } from "next";
import SharePlayer from "./SharePlayer";

interface Props {
  params: { matchId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeURIComponent(params.matchId);
  return {
    title: `라이브TV - 경기 공유`,
    description: `라이브TV에서 실시간 스포츠 중계를 시청하세요.`,
    openGraph: {
      title: `라이브TV - 스포츠 중계`,
      description: `실시간 스포츠 중계 공유 링크 (${id})`,
    },
  };
}

export default function SharePage({ params }: Props) {
  return <SharePlayer matchId={decodeURIComponent(params.matchId)} />;
}
