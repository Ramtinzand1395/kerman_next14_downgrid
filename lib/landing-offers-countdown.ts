const secondsPerDay = 24 * 60 * 60;
const resetTimeInSeconds = 8 * 60 * 60;

const tehranClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tehran",
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function secondsUntilNextOffersCycle(now = Date.now()) {
  const [hour, minute, second] = tehranClock.format(now).split(":").map(Number);
  const elapsedToday = hour * 60 * 60 + minute * 60 + second;
  const remainingToday = resetTimeInSeconds - elapsedToday;

  return remainingToday > 0 ? remainingToday : remainingToday + secondsPerDay;
}
