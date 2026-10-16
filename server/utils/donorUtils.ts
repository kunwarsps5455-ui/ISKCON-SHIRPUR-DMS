export function calculateCategory(totalDonation: number): string {
  if (totalDonation >= 1000000) {
    return 'PLATINUM';
  } else if (totalDonation >= 500000) {
    return 'GOLD';
  } else if (totalDonation >= 100000) {
    return 'SILVER';
  } else {
    return 'SUDAMA';
  }
}
