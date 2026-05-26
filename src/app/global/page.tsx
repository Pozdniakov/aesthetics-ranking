import { GlobalRankingClient } from "./GlobalRankingClient";

export const metadata = {
  title: "Global Ranking",
  description:
    "The collective top, aggregated from every comparison ever made.",
};

export default function GlobalRankingPage() {
  return <GlobalRankingClient />;
}
