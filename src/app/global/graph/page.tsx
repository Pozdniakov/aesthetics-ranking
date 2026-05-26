import { AffinityGraphClient } from "./AffinityGraphClient";

export const metadata = {
  title: "Affinity Graph",
  description:
    "Which aesthetics share a taste? Co-occurrence graph built from every shared top 5.",
};

export default function AffinityGraphPage() {
  return <AffinityGraphClient />;
}
