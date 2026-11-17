import type { Plate } from "../data/exhibition";

interface Impression {
  input: string;
  result: string;
  mark: number;
}

// Deadwood 0.1.2, --include unused_file, src/index.ts as the entry point.
// Each listed import refers to an otherwise unreferenced sibling module.
const roots: Impression[] = [
  { input: "Import trunk", result: "2 unused files · branch.ts, leaf.ts", mark: 1 },
  { input: "Import trunk + branch", result: "1 unused file · leaf.ts", mark: 2 },
  { input: "Import trunk + branch + leaf", result: "0 unused files", mark: 3 },
];

export function impressions(id: Plate["id"]): Impression[] {
  if (id === "deadwood") return roots;
  if (id === "crap")
    return [0, 25, 50, 75, 100].map((coverage) => {
      const score = 8 ** 2 * (1 - coverage / 100) ** 3 + 8;
      return {
        input: coverage + "% coverage",
        result: "CRAP score " + score.toFixed(2),
        mark: score,
      };
    });
  return ["init.lua:12", "marks.lua:24", "scope.lua:36"].map((file, i) => ({
    input: ":WaystoneSelect " + (i + 1),
    result: file,
    mark: i + 1,
  }));
}

const paper = "#f4f0e6";
const ink = "#1c1b17";
const red = "#d83416";
const targets = [
  [0.23, 0.72],
  [0.57, 0.29],
  [0.8, 0.56],
];

// The visible proof and the downloaded PNG are the same high-resolution sheet.
export function drawProof(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  plate: Plate,
  impression: Impression,
  folio: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  const x = 50,
    y = 126,
    iw = w - x * 2,
    ih = 720;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.font = "36px Anton, sans-serif";
  ctx.fillText("UNDER PRESSURE", x, 77);
  ctx.font = "20px monospace";
  ctx.textAlign = "right";
  ctx.fillText("PLATE " + folio, w - x, 75);
  ctx.textAlign = "left";
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, iw, ih);
  ctx.clip();
  const scale = Math.max(iw / img.naturalWidth, ih / img.naturalHeight);
  const dw = img.naturalWidth * scale,
    dh = img.naturalHeight * scale;
  const dx = x + (iw - dw) / 2,
    dy = y + (ih - dh) / 2;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.globalCompositeOperation = "source-over";
  if (plate.id === "deadwood") {
    // Missing modules leave uninked bands through the canopy.
    for (let n = impression.mark; n < 3; n++) {
      const band = x + iw * (n === 1 ? 0.21 : 0.76);
      ctx.fillStyle = paper;
      ctx.fillRect(band, y, 36, ih);
      ctx.fillStyle = red;
      ctx.fillRect(band + 14, y, 2, ih);
    }
  } else if (plate.id === "crap") {
    // Progressive horizontal misregistration encodes the risk score.
    const slip = (impression.mark - 8) * 0.85;
    for (let i = 1; i < 10; i += 2) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y + (ih * i) / 10, iw, ih / 10);
      ctx.clip();
      ctx.drawImage(img, dx + slip, dy, dw, dh);
      ctx.restore();
    }
  } else {
    for (const [i, point] of targets.entries()) {
      const px = x + point[0] * iw,
        py = y + point[1] * ih;
      const selected = i + 1 === impression.mark;
      ctx.strokeStyle = paper;
      ctx.fillStyle = selected ? red : ink;
      ctx.lineWidth = selected ? 5 : 2;
      ctx.beginPath();
      ctx.arc(px, py, selected ? 29 : 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = paper;
      ctx.font = "bold 19px monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), px, py + 6);
    }
  }
  ctx.restore();
  ctx.fillStyle = ink;
  ctx.textAlign = "left";
  ctx.font = "75px Anton, sans-serif";
  ctx.fillText(plate.title.toUpperCase(), x, 952);
  ctx.font = "italic 32px Georgia, serif";
  ctx.fillText(plate.id + " / " + plate.medium, x, 1005);
  ctx.fillRect(x, 1043, iw, 2);
  ctx.font = "25px monospace";
  ctx.fillText(impression.input, x, 1092);
  ctx.fillText(impression.result, x, 1132);
  ctx.font = "18px monospace";
  ctx.textAlign = "right";
  ctx.fillText("MATTRILEY.TOOLS", w - x, h - 30);
}
