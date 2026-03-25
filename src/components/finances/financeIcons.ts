import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export const getIconByName = (name: string): LucideIcon => {
    const Icon = (LucideIcons as any)[name];
    return Icon || LucideIcons.Tag;
};

export const COMMON_FINANCE_ICONS = [
    'Utensils', 'Car', 'ShoppingBag', 'Receipt', 'Play', 'Heart', 'Plane', 
    'MoreHorizontal', 'ShoppingBasket', 'Coffee', 'Home', 'Zap', 'CreditCard',
    'Smartphone', 'Monitor', 'Gamepad', 'Gift', 'Dumbbell'
];
