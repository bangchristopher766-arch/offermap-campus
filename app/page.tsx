import type { Metadata } from "next";
import { OfferMapApp } from "./components/OfferMapApp";

export const metadata: Metadata = {
  title: "OfferMap · 应届求职工作台",
  description: "把岗位 JD、简历证据与面试追问连成一张可准备的地图。",
};

export default function Home() {
  return <OfferMapApp />;
}
