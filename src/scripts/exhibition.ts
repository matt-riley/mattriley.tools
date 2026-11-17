import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Plate } from "../data/exhibition";
import { drawProof, impressions } from "./proof";

gsap.registerPlugin(ScrollTrigger);
const one = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const all = <T extends HTMLElement = HTMLElement>(s: string) => [
  ...document.querySelectorAll<T>(s),
];
const folio = (i: number) => String(i + 1).padStart(2, "0");
const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
const media = gsap.matchMedia();
media.add("(prefers-reduced-motion: no-preference)", () => {
  gsap
    .timeline({ defaults: { ease: "power3.out" } })
    .from(".type-line b", {
      yPercent: 105,
      rotation: 3,
      transformOrigin: "left center",
      duration: 0.72,
      stagger: 0.1,
    })
    .from(".cover-art", { clipPath: "inset(0 100% 0 0)", duration: 1.05, ease: "power3.inOut" }, 0)
    .from(".cover-art img", { filter: "grayscale(1)", duration: 0.65 }, 0.48)
    .fromTo(
      ".ink-pass",
      { xPercent: -105 },
      { xPercent: 105, duration: 0.9, ease: "power2.inOut" },
      0.14,
    )
    .from(".intro p, .intro .ink-button", { y: 10, duration: 0.45, stagger: 0.09 }, 0.15);
  all(".thumb").forEach((thumb) =>
    gsap.from(thumb, {
      clipPath: "inset(0 0 13% 0)",
      duration: 0.8,
      ease: "power3.out",
      scrollTrigger: { trigger: thumb, start: "top 96%", once: true },
    }),
  );
});
all("[data-enhance]").forEach((el) => {
  el.hidden = false;
});

const groups = all("[data-group]");
const search = one<HTMLInputElement>("#search"),
  filter = one<HTMLSelectElement>("#collection");
function filterIndex() {
  let count = 0;
  const term = search.value.trim().toLowerCase();
  for (const group of groups) {
    const rows = [...group.querySelectorAll<HTMLElement>(".index-row")];
    let visible = 0;
    for (const row of rows) {
      row.hidden = !(row.textContent ?? "").toLowerCase().includes(term);
      if (!row.hidden) visible++;
    }
    group.hidden =
      Boolean(filter.value && filter.value !== group.id) ||
      (visible === 0 && (!!term || rows.length > 0));
    if (!group.hidden) count += visible;
  }
  one(".no-results").hidden = count !== 0;
  one("#result-count").textContent = count + " matching works";
}
search.addEventListener("input", filterIndex);
filter.addEventListener("change", filterIndex);
one("#clear-search").addEventListener("click", () => {
  search.value = "";
  filter.value = "";
  filterIndex();
  search.focus();
});

const studio = one<HTMLDialogElement>("#studio");
if (studio) prepareStudio(studio);

function prepareStudio(dialog: HTMLDialogElement) {
  const plates: Plate[] = JSON.parse(dialog.dataset.plates!);
  const cover = one<HTMLImageElement>("[data-cover-image]");
  const link = one<HTMLAnchorElement>("[data-cover-link]");
  const canvas = one<HTMLCanvasElement>(".proof canvas");
  const specimen = one<HTMLSelectElement>("#specimen");
  const pull = one<HTMLButtonElement>("#pull");
  const status = one(".studio-status");
  const images = new Map<string, Promise<HTMLImageElement>>();
  const settings = new Map<string, number>();
  let current = 0,
    selected = 0,
    loadTicket = 0,
    turning = false;
  let readyImage: HTMLImageElement | undefined;

  const lens = one(".loupe");
  media.add(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    () => {
      // The loupe reads the same crop as the underlying print, including object-position.
      function inspect(event: PointerEvent) {
        if (!cover.naturalWidth) return;
        const rect = link.getBoundingClientRect();
        const x = event.clientX - rect.left,
          y = event.clientY - rect.top;
        const zoom = 2.15;
        const fit = Math.max(rect.width / cover.naturalWidth, rect.height / cover.naturalHeight);
        const width = cover.naturalWidth * fit,
          height = cover.naturalHeight * fit;
        const radius = lens.offsetWidth / 2;
        lens.style.backgroundImage = "url(" + cover.src + ")";
        lens.style.backgroundSize = width * zoom + "px " + height * zoom + "px";
        lens.style.backgroundPosition =
          radius -
          (x - (rect.width - width) / 2) * zoom +
          "px " +
          (radius - (y - (rect.height - height) * 0.45) * zoom) +
          "px";
        gsap.set(lens, { x: x - radius, y: y - radius });
      }
      function enter(event: PointerEvent) {
        inspect(event);
        gsap.to(lens, { scale: 1, opacity: 1, duration: 0.19, overwrite: "auto" });
      }
      function leave() {
        gsap.to(lens, { scale: 0.8, opacity: 0, duration: 0.14, overwrite: "auto" });
      }
      link.addEventListener("pointerenter", enter);
      link.addEventListener("pointermove", inspect);
      link.addEventListener("pointerleave", leave);
      return () => {
        link.removeEventListener("pointerenter", enter);
        link.removeEventListener("pointermove", inspect);
        link.removeEventListener("pointerleave", leave);
        gsap.set(lens, { opacity: 0 });
      };
    },
  );

  function loadImage(plate: Plate) {
    const saved = images.get(plate.id);
    if (saved) return saved;
    const img = new Image();
    img.src = plate.image;
    const loaded = img
      .decode()
      .then(() => img)
      .catch((error) => {
        images.delete(plate.id);
        throw error;
      });
    images.set(plate.id, loaded);
    return loaded;
  }

  function showCover(index: number) {
    current = index;
    const p = plates[index];
    cover.src = p.image;
    cover.alt = p.alt;
    link.dataset.open = p.id;
    link.href = "/" + p.route + "/" + p.id + "/";
    link.setAttribute("aria-label", "Explore " + p.title);
    one("[data-medium]").textContent = p.medium;
    one("[data-cover-title]").textContent = p.title;
    one("[data-cover-id]").textContent = p.id;
    one("[data-cover-number]").textContent = folio(index);
    one("[data-position]").textContent = folio(index);
  }

  for (const button of all<HTMLButtonElement>("[data-turn]"))
    button.addEventListener("click", async () => {
      if (turning) return;
      turning = true;
      const next = (current + Number(button.dataset.turn) + plates.length) % plates.length;
      try {
        await loadImage(plates[next]);
        if (motion.matches) {
          showCover(next);
          turning = false;
          return;
        }
        gsap
          .timeline({
            onComplete: () => {
              turning = false;
            },
          })
          .to(".cover-frame", { rotationY: -88, skewY: -3, duration: 0.24, ease: "power2.in" })
          .call(() => showCover(next))
          .fromTo(
            ".cover-frame",
            { rotationY: 88, skewY: 3 },
            { rotationY: 0, skewY: 0, duration: 0.42, ease: "power3.out", clearProps: "transform" },
          );
      } catch {
        turning = false;
      }
    });

  function updateProof(animate: boolean) {
    const plate = plates[selected];
    const value = Number(specimen.value);
    const state = impressions(plate.id)[value];
    settings.set(plate.id, value);
    one<HTMLOutputElement>("#result").value = state.result;
    if (!readyImage) return;
    drawProof(canvas, readyImage, plate, state, folio(selected));
    if (animate && !motion.matches)
      gsap.fromTo(
        canvas,
        { clipPath: "inset(0 0 92% 0)", y: 5 },
        { clipPath: "inset(0 0 0% 0)", y: 0, duration: 0.48, ease: "power3.out", overwrite: true },
      );
  }

  async function openPlate(index: number) {
    const ticket = ++loadTicket;
    selected = index;
    const p = plates[index];
    readyImage = undefined;
    canvas.style.visibility = "hidden";
    status.textContent = "Preparing proof…";
    pull.disabled = true;
    one("#studio-title").textContent = p.title;
    one("[data-studio-folio]").textContent = "Plate " + folio(index) + " / " + p.id;
    one("[data-instructions]").textContent = p.note;
    const tool = one<HTMLAnchorElement>("[data-tool-link]");
    tool.href = "/" + p.route + "/" + p.id + "/";
    tool.textContent = "Open " + p.id;
    one("[data-setting-label]").textContent =
      p.id === "crap"
        ? "Test coverage"
        : p.id === "deadwood"
          ? "Entry point imports"
          : "Saved position";
    specimen.replaceChildren(...impressions(p.id).map((s, i) => new Option(s.input, String(i))));
    specimen.value = String(settings.get(p.id) ?? (p.id === "crap" ? 2 : 0));
    updateProof(false);
    dialog.showModal();
    document.documentElement.classList.add("proof-open");
    try {
      const [img] = await Promise.all([loadImage(p), document.fonts.load("36px Anton")]);
      if (ticket !== loadTicket || !dialog.open) return;
      readyImage = img;
      updateProof(true);
      canvas.style.visibility = "visible";
      pull.disabled = false;
      status.textContent = "";
    } catch {
      if (ticket === loadTicket)
        status.textContent = "The print could not load. Close and reopen to retry.";
    }
  }

  all<HTMLAnchorElement>("[data-open]").forEach((anchor) =>
    anchor.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const index = plates.findIndex((p) => p.id === anchor.dataset.open);
      if (index < 0) return;
      event.preventDefault();
      void openPlate(index);
    }),
  );
  specimen.addEventListener("change", () => {
    status.textContent = "";
    updateProof(true);
  });
  one(".close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    loadTicket++;
    document.documentElement.classList.remove("proof-open");
  });
  pull.addEventListener("click", () => {
    const name = plates[selected].id + "-proof-" + (Number(specimen.value) + 1) + ".png";
    const ticket = loadTicket;
    canvas.toBlob((blob) => {
      if (!blob || ticket !== loadTicket) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      status.textContent = "Print pulled · PNG";
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, "image/png");
  });
}
