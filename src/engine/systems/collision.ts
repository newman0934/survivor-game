/**
 * 碰撞 system（collision）。
 *
 * 提供以「圓形碰撞」為基礎的重疊判定。遊戲中所有 entity 都以一個半徑（radius）近似為圓，
 * 兩種主要碰撞都靠此判定：投射物 vs 敵人（造成傷害）、敵人 vs 玩家（玩家受傷）。
 * 純函式、無狀態；實際的傷害結算與 entity 移除由 World 負責。
 *
 * 在 World.step() 中的角色：World 掃描相關 entity 配對，用 circlesOverlap 判定是否相撞，
 * 再套用對應的遊戲效果。
 */
import type { Entity } from '../types'
import { distance } from '../core/vector'

/**
 * 判定兩個 entity 的碰撞圓是否重疊（含相切）。
 *
 * 當圓心距離小於等於兩者半徑之和時視為重疊。
 *
 * @param a 第一個 entity（使用其 pos 與 radius）。
 * @param b 第二個 entity（使用其 pos 與 radius）。
 * @returns 兩圓重疊或相切時為 true。
 */
export function circlesOverlap(a: Entity, b: Entity): boolean {
  return distance(a.pos, b.pos) <= a.radius + b.radius
}
