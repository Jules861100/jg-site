import fs from "node:fs";
import path from "node:path";
import "./_design/landing.css";
import LandingClient from "./_design/LandingClient";

export default function Home() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "src/app/_design/landing.body.html"),
    "utf8"
  );

  return <LandingClient html={html} />;
}
