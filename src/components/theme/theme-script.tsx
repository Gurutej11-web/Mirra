export type Theme = "dark" | "light" | "system";
const KEY = "mirra-theme";

/** Runs before paint so the right theme shows with no flash. */
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem("${KEY}")||"dark";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage unavailable */
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  const light = t === "light" || (t === "system" && matchMedia("(prefers-color-scheme: light)").matches);
  meta?.setAttribute("content", light ? "#faf7f4" : "#0b0a0c");
}

export function storedTheme(): Theme | null {
  try {
    return (localStorage.getItem(KEY) as Theme | null) ?? null;
  } catch {
    return null;
  }
}
