# Merchant policy structured data

The terms page defines the existing Organization (`/#organization`) with a
MerchantReturnPolicy at `/terms#return-policy`. The policy uses
`merchantReturnLink: /terms#returns` (absolute canonical URLs in output), the
Organization-level alternative supported by Google. Each single Offer and
AggregateOffer references that same policy via `@id`, and identifies the seller.
The visible policy is unchanged: it describes working days and product exceptions.
Do not replace that policy with an invented seven-calendar-day period or a blanket
no-returns declaration for digital products.

Product category uses custom plain Text. Empty/malformed category values,
database IDs and URLs are omitted; no Google taxonomy ID is guessed. A current
valid category may already have been accepted after Google's older crawl, so the
historical warning must be checked again after deployment and recrawl.

## Shipping limitation

The shipping settings have a fixed Kerman delivery fee and variable nationwide
collect-on-delivery carrier fees. They do not specify authoritative handling and
transit times. Google OfferShippingDetails requires a numeric shipping rate and
delivery times; its regional subdivisions currently do not support Iran. A Kerman
city fee must not be published as the rate for all of Iran, and an unknown carrier
fee must never be encoded as zero. Therefore this change deliberately leaves
OfferShippingDetails absent. The optional shippingDetails warning can remain.
There is no change to checkout shipping, fees, or visible legal terms.

The Organization-level return-policy link may be used by Google after recrawling,
but removal of historical per-offer warnings is not guaranteed until live validation.
Multi-products continue to use AggregateOffer, which is eligible for product
snippets; Google merchant listings require Offer. ProductGroup/variant migration
is outside this fix.

## Validation

`npm test` exercises the real product and terms page functions with controlled data,
reads their emitted JSON-LD, and verifies the matching policy IDs and seller IDs for
single and multi-products, exact price conversion, category normalization, and
absence of fabricated shipping details. No real database is accessed by these tests.
Run `npx tsc --noEmit` as well. Full store build, live Rich Results Test and Search
Console validation remain deployment-time work.

References:
- https://developers.google.com/search/docs/appearance/structured-data/return-policy
- https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
