import BroadcastClient from "./BroadcastClient";
import { fetchSportsLiveData } from "@/lib/sports-live";

interface BroadcastPageProps {
  searchParams?: {
    sport?: string;
    match?: string;
  };
}

export default async function BroadcastPage({ searchParams }: BroadcastPageProps) {
  const requestedSport = searchParams?.sport ?? "";
  const initialSport = requestedSport || "all";
  const autoMatchId = searchParams?.match ?? "";

  try {
    const data = await fetchSportsLiveData(requestedSport);
    return (
      <BroadcastClient
        initialSport={initialSport}
        initialLiveGames={data.live}
        initialWaitingGames={data.waiting}
        autoMatchId={autoMatchId}
      />
    );
  } catch {
    return (
      <BroadcastClient
        initialSport={initialSport}
        initialLiveGames={[]}
        initialWaitingGames={[]}
        autoMatchId={autoMatchId}
      />
    );
  }
}
