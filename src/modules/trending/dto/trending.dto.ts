export class TrendingItem {
  constructor(
    public readonly name: string,
    public readonly link: string,
    public readonly quantity: string | null = null,
  ) {}

  get Quantity(): boolean {
    return this.quantity !== null;
  }
}