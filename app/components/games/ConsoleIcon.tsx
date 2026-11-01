export default function ConsoleIcon({ device }: { device: string }) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10" aria-hidden="true">
    {device.startsWith("xbox") ? <><rect x="13" y="5" width="23" height="38" rx="3" /><path d="M18 10h13M18 14h13M18 18h13" /><circle cx="30" cy="35" r="3" /><path d="m28 33 4 4m0-4-4 4" /></> : device === "ps5" ? <><path d="M14 4c4 5 4 31 0 39l10-3 10 3c-4-8-4-34 0-39L24 7 14 4Z" /><path d="M24 8v30m4-6v6M11 44h26" /></> : <><path d="m6 15 29-7 7 9-29 7-7-9Zm0 10 7 9 29-7M6 34l7 8 29-7M13 24v18" /><path d="m19 30 15-4m-15 8 9-2" /></>}
  </svg>;
}
