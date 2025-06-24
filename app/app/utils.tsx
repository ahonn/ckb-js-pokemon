export function formatString(str: string, start: number, end: number) {
  if (str.length <= start + end) {
    return str;
  }
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

export function useGetExplorerLink() {
  const explorerAddress = (address: string) => `https://pudge.explorer.nervos.org/address/${address}`;
  const index = "https://pudge.explorer.nervos.org/";
  
  return { explorerAddress, index };
}