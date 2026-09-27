<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/**
 * The landing page CTA that opened the order form (NotFound: the public
 * 404 page's "Order a device").
 */
enum LeadSource: string
{
    use HasOptions;

    case Hero = 'hero';
    case Navbar = 'navbar';
    case PricingBuy = 'pricing-buy';
    case PricingLease = 'pricing-lease';
    case PricingChain = 'pricing-chain';
    case Lookbook = 'lookbook';
    case OrderSection = 'order-section';
    case MobileMenu = 'mobile-menu';
    case Footer = 'footer';
    case NotFound = 'not-found';

    public function label(): string
    {
        return match ($this) {
            self::Hero => 'Hero',
            self::Navbar => 'Navigation bar',
            self::PricingBuy => 'Pricing: Buy',
            self::PricingLease => 'Pricing: Lease',
            self::PricingChain => 'Pricing: Chain',
            self::Lookbook => 'Lookbook',
            self::OrderSection => 'Order section',
            self::MobileMenu => 'Mobile menu',
            self::Footer => 'Footer',
            self::NotFound => 'Page not found (404)',
        };
    }
}
