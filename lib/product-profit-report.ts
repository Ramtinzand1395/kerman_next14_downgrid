import Order from "@/model/Order";
import PosSale from "@/model/PosSale";
import Product from "@/model/Product";
import type { ReportRange } from "@/lib/dashboard-date-range";
import { paidDateFilter } from "@/lib/dashboard-report";
import { calculateSaleProfit, summarizeInventory, websiteSaleProfit } from "@/lib/product-profit";

export async function loadProductProfitSection(range: ReportRange) {
  const date = { $gte: range.startInclusive, $lt: range.endExclusive };
  const loadInventory = async () => {
    const products = await Product.find({ deletedAt: null })
      .select("price discountPrice stock productType variants purchasePrices")
      .lean();
    const { knownInventoryProfit, missingPurchasePriceProducts } = summarizeInventory(products);
    return { knownInventoryProfit, missingPurchasePriceProducts };
  };

  const loadWebsiteSales = async () => {
    const orders = Order.find({ ...paidDateFilter(range), status: { $ne: "cancelled" } })
      .select("paymentStatus status totalPrice couponDiscount items.quantity salePurchasePrices")
      .lean()
      .cursor();
    let knownProfit = 0;
    let unknownSales = 0;
    for await (const order of orders) {
      const profit = websiteSaleProfit(order);
      if (profit === null) unknownSales++;
      else knownProfit += profit;
    }
    return { knownProfit, unknownSales };
  };

  const loadPosSales = async () => {
    const sales = PosSale.find({ soldAtUtc: date })
      .select("items.quantity finalAmountToman salePurchasePrices purchasePricesEstimated")
      .lean()
      .cursor();
    let knownProfit = 0;
    let estimatedProfit = 0;
    let estimatedSales = 0;
    let unknownSales = 0;
    for await (const sale of sales) {
      const profit = calculateSaleProfit(sale.items, sale.salePurchasePrices, sale.finalAmountToman);
      if (profit === null) unknownSales++;
      else if (sale.purchasePricesEstimated !== false) {
        estimatedProfit += profit;
        estimatedSales++;
      } else {
        knownProfit += profit;
      }
    }
    return { knownProfit, estimatedProfit, estimatedSales, unknownSales };
  };

  const [inventory, website, pos] = await Promise.all([loadInventory(), loadWebsiteSales(), loadPosSales()]);
  return { ...inventory, website, pos, knownSalesProfit: website.knownProfit + pos.knownProfit };
}
