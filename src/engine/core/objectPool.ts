export class ObjectPool<T> {
  private free: T[] = []
  constructor(private readonly factory: () => T) {}

  acquire(): T {
    return this.free.pop() ?? this.factory()
  }

  release(obj: T): void {
    this.free.push(obj)
  }
}
