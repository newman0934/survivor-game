/** 玩家 index 跨機共識：所有端對相同 id 集合以字典序得到相同順序。 */

/** 回傳 id 字典序排序的新陣列（不改入參）。 */
export function sortPlayerIds(ids: string[]): string[] {
  return [...ids].sort()
}

/** 回傳 id 在排序陣列的位置；不存在回 -1。 */
export function indexOfPlayer(sortedIds: string[], id: string): number {
  return sortedIds.indexOf(id)
}
