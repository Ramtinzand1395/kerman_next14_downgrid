export default function ConsoleIcon({ device }: { device: string }) {
  return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="h-12 w-12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {device.startsWith("xbox") ? <><rect x="17" y="7" width="30" height="50" rx="4" /><circle cx="32" cy="21" r="8" /><path d="m27 16 10 10m0-10L27 26M24 45h16" /><circle cx="39" cy="50" r="1" /></> : device === "ps5" ? <><path d="M22 6c-7 14-7 35-9 49l13 3h12l13-3c-2-14-2-35-9-49l-6 5h-8z" fill="currentColor" fillOpacity=".08" /><path d="M28 11v47m8-47v47m-7-8h6M42 40v10" /></> : <><path d="m10 20 8-10h36l-8 10zm0 0v13h36V20M10 34v13l36 7 8-12V28L46 34z" fill="currentColor" fillOpacity=".08" /><path d="M16 27h25m-25 15h25m8-18 5-7" /></>}
  </svg>;
}
