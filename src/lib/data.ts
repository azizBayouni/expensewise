
import {
  Utensils,
  ShoppingBag,
  Home,
  Car,
  TrendingUp,
  Receipt,
  Shirt,
  Laptop,
  Building,
  Fuel,
  Landmark,
  PiggyBank,
} from 'lucide-react';

export type User = {
  name: string;
  email: string;
  avatar: string;
};

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parentId: string | null;
  icon?: string;
  userId: string;
};

export type Transaction = {
  id:string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  subCategory?: string; // This will now represent the leaf category name
  wallet: string;
  description?: string;
  currency: string;
  attachments?: { name: string, url: string }[];
  eventId?: string;
  excludeFromReport?: boolean;
  userId: string;
};

export type Wallet = {
  id: string;
  name: string;
  initialBalance: number;
  currency: string;
  icon?: string;
  linkedCategoryIds: string[];
  userId: string;
  isDeletable: boolean;
};

export type Payment = {
    id: string;
    date: string;
    amount: number;
};

export type Debt = {
  id: string;
  type: 'payable' | 'receivable';
  person: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'paid' | 'unpaid' | 'partial';
  note?: string;
  payments: Payment[];
  userId: string;
};

export type Event = {
  id: string;
  name: string;
  icon: string;
  status: 'active' | 'inactive';
  userId: string;
};

export const currencies = [
  "USD", "EUR", "JPY", "GBP", "CNY", "AUD", "CAD", "CHF", "HKD", "SGD", 
  "KRW", "INR", "RUB", "BRL", "MXN", "ZAR", "NZD", "SEK", "NOK", "DKK", 
  "TRY", "THB", "MYR", "IDR", "PHP", "SAR", "AED", "ILS", "ARS", "CLP", 
  "COP", "EGP", "NGN", "VND", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", 
  "ISK", "UAH", "KWD", "QAR", "OMR", "BHD", "JOD", "TWD", "TND", "MAD", 
  "DZD", "PEN", "VES", "GTQ", "CRC", "HNL", "NIO", "PAB", "BOB", "UYU", 
  "PYG", "JMD", "TTD", "BBD", "BSD", "AWG", "ANG", "KYD", "XCD", "FJD", 
  "PGK", "WST", "TOP", "VUV", "SBD", "MOP", "BND", "MMK", "KHR", "LAK", 
  "MNT", "KZT", "UZS", "TJS", "TMT", "AZN", "GEL", "AMD", "BYN", "KGS", 
  "MZN", "ZMW", "MWK", "GHS", "ETB", "KES", "UGX", "RWF", "BWP", "NAD"
];

export type EmojiIcon = {
  icon: string;
  name: string;
};

export const emojiIcons: EmojiIcon[] = [
  { icon: '💰', name: 'Money Bag' }, { icon: '💵', name: 'Dollar Bill' }, { icon: '💴', name: 'Yen Bill' }, { icon: '💶', name: 'Euro Bill' }, { icon: '💷', name: 'Pound Bill' },
  { icon: '💸', name: 'Money with Wings' }, { icon: '💳', name: 'Credit Card' }, { icon: '📈', name: 'Chart Increasing' }, { icon: '📉', name: 'Chart Decreasing' },
  { icon: '📊', name: 'Bar Chart' }, { icon: '💼', name: 'Briefcase' }, { icon: '🏦', name: 'Bank' }, { icon: '🏛️', name: 'Classical Building' },
  { icon: '🐷', name: 'Piggy Bank' }, { icon: '🤑', name: 'Money-Mouth Face' }, { icon: '🎁', name: 'Gift' }, { icon: '🏆', name: 'Trophy' },
  { icon: '🥇', name: '1st Place Medal' }, { icon: '👑', name: 'Crown' }, { icon: '🧾', name: 'Receipt' }, { icon: '🍔', name: 'Hamburger' },
  { icon: '🍟', name: 'French Fries' }, { icon: '🍕', name: 'Pizza' }, { icon: '☕', name: 'Coffee' }, { icon: '🍺', name: 'Beer Mug' },
  { icon: '🍷', name: 'Wine Glass' }, { icon: '🍸', name: 'Cocktail Glass' }, { icon: '🥡', name: 'Takeout Box' }, { icon: '🛒', name: 'Shopping Cart' },
  { icon: '🍎', name: 'Apple' }, { icon: '🥕', name: 'Carrot' }, { icon: '🍞', name: 'Bread' }, { icon: '🧀', name: 'Cheese' }, { icon: '🥩', name: 'Cut of Meat' },
  { icon: '🍗', name: 'Poultry Leg' }, { icon: '🍣', name: 'Sushi' }, { icon: '🍦', name: 'Ice Cream' }, { icon: '🥐', name: 'Croissant' },
  { icon: '🥑', name: 'Avocado' }, { icon: '🥦', name: 'Broccoli' }, { icon: '🍓', name: 'Strawberry' }, { icon: '🍉', name: 'Watermelon' },
  { icon: '🥗', name: 'Salad' }, { icon: '🍿', name: 'Popcorn' }, { icon: '🍩', name: 'Doughnut' }, { icon: '🍪', name: 'Cookie' },
  { icon: '🎂', name: 'Birthday Cake' }, { icon: '🛍️', name: 'Shopping Bags' }, { icon: '🏷️', name: 'Label' }, { icon: '🏬', name: 'Department Store' },
  { icon: '👕', name: 'T-Shirt' }, { icon: '👗', name: 'Dress' }, { icon: '💻', name: 'Laptop' }, { icon: '📱', name: 'Mobile Phone' },
  { icon: '⌚', name: 'Watch' }, { icon: '📚', name: 'Books' }, { icon: '💊', name: 'Pill' }, { icon: '💍', name: 'Ring' },
  { icon: '💎', name: 'Gem Stone' }, { icon: '👠', name: 'High-Heeled Shoe' }, { icon: '👜', name: 'Handbag' }, { icon: '👔', name: 'Necktie' },
  { icon: '👖', name: 'Jeans' }, { icon: '👟', name: 'Running Shoe' }, { icon: '🕶️', name: 'Sunglasses' }, { icon: '🎒', name: 'Backpack' },
  { icon: '🌂', name: 'Umbrella' }, { icon: '🎩', name: 'Top Hat' }, { icon: '🏠', name: 'House' }, { icon: '🏡', name: 'House with Garden' },
  { icon: '🏢', name: 'Office Building' }, { icon: '🛋️', name: 'Couch and Lamp' }, { icon: '💡', name: 'Light Bulb' }, { icon: '💧', name: 'Droplet' },
  { icon: '🔑', name: 'Key' }, { icon: '🛠️', name: 'Hammer and Wrench' }, { icon: '🔥', name: 'Fire' }, { icon: '🌬️', name: 'Wind Face' },
  { icon: '🧱', name: 'Brick' }, { icon: '🪑', name: 'Chair' }, { icon: '🚪', name: 'Door' }, { icon: '🛏️', name: 'Bed' }, { icon: '🛁', name: 'Bathtub' },
  { icon: '🚿', name: 'Shower' }, { icon: '🚗', name: 'Car' }, { icon: '🚕', name: 'Taxi' }, { icon: '🚌', name: 'Bus' }, { icon: '🚆', name: 'Train' },
  { icon: '✈️', name: 'Airplane' }, { icon: '⛽', name: 'Fuel Pump' }, { icon: '🚲', name: 'Bicycle' }, { icon: '🛴', name: 'Kick Scooter' },
  { icon: '🚢', name: 'Ship' }, { icon: '🚤', name: 'Speedboat' }, { icon: '🚁', name: 'Helicopter' }, { icon: '🛵', name: 'Motor Scooter' },
  { icon: '🏎️', name: 'Racing Car' }, { icon: '🚄', name: 'High-Speed Train' }, { icon: '🚠', name: 'Mountain Cableway' }, { icon: '🛸', name: 'Flying Saucer' },
  { icon: '⛵', name: 'Sailboat' }, { icon: '🏥', name: 'Hospital' }, { icon: '💪', name: 'Flexed Biceps' }, { icon: '🏃', name: 'Person Running' },
  { icon: '🏋️', name: 'Person Lifting Weights' }, { icon: '🧘', name: 'Person in Lotus Position' }, { icon: '❤️', name: 'Red Heart' }, { icon: '🧠', name: 'Brain' },
  { icon: '🦷', name: 'Tooth' }, { icon: '🩺', name: 'Stethoscope' }, { icon: '🎬', name: 'Clapper Board' }, { icon: '🎤', name: 'Microphone' },
  { icon: '🎧', name: 'Headphone' }, { icon: '🎮', name: 'Video Game' }, { icon: '🎭', name: 'Performing Arts' }, { icon: '🎨', name: 'Artist Palette' },
  { icon: '🎟️', name: 'Admission Tickets' }, { icon: '🎫', name: 'Ticket' }, { icon: '⚽', name: 'Soccer Ball' }, { icon: '🏀', name: 'Basketball' },
  { icon: '🏖️', name: 'Beach with Umbrella' }, { icon: '🎉', name: 'Party Popper' }, { icon: '🎳', name: 'Bowling' }, { icon: '🎯', name: 'Direct Hit' },
  { icon: '🎰', name: 'Slot Machine' }, { icon: '🎱', name: 'Pool 8 Ball' }, { icon: '🎻', name: 'Violin' }, { icon: '🎺', name: 'Trumpet' },
  { icon: '🎸', name: 'Guitar' }, { icon: '🥁', name: 'Drum' }, { icon: '🎲', name: 'Game Die' }, { icon: '🧩', name: 'Jigsaw' },
  { icon: '🃏', name: 'Joker' }, { icon: '🀄', name: 'Mahjong Red Dragon' }, { icon: '💈', name: 'Barber Pole' }, { icon: '💅', name: 'Nail Polish' },
  { icon: '✂️', name: 'Scissors' }, { icon: '💄', name: 'Lipstick' }, { icon: '🧴', name: 'Lotion Bottle' }, { icon: '🧖', name: 'Person in Steamy Room' },
  { icon: '🎓', name: 'Graduation Cap' }, { icon: '🏫', name: 'School' }, { icon: '📝', name: 'Memo' }, { icon: '❓', name: 'Question Mark' },
  { icon: '💡', name: 'Light Bulb' }, { icon: '🌍', name: 'Globe' }, { icon: '🛠️', name: 'Hammer and Wrench' }, { icon: '⚙️', name: 'Gear' },
  { icon: '🖇️', name: 'Linked Paperclips' }, { icon: '👪', name: 'Family' }, { icon: '🐶', name: 'Dog Face' }, { icon: '🐱', name: 'Cat Face' },
  { icon: '🪴', name: 'Potted Plant' }, { icon: '🏧', name: 'ATM Sign' }, { icon: '💹', name: 'Chart Increasing with Yen' }, { icon: '₿', name: 'Bitcoin' },
  { icon: '🪙', name: 'Coin' }, { icon: '⚖️', name: 'Balance Scale' }, { icon: '👶', name: 'Baby' }, { icon: '🧒', name: 'Child' },
  { icon: '🧑', name: 'Person' }, { icon: '🧓', name: 'Older Person' }, { icon: '👨‍👩‍👧‍👦', name: 'Family: Man, Woman, Girl, Boy' },
  { icon: '🗺️', name: 'World Map' }, { icon: '🧭', name: 'Compass' }, { icon: '🏔️', name: 'Snow-Capped Mountain' }, { icon: '🏕️', name: 'Camping' },
  { icon: '🏜️', name: 'Desert' }, { icon: '🏝️', name: 'Desert Island' }, { icon: '🏞️', name: 'National Park' }, { icon: '🏗️', name: 'Building Construction' },
  { icon: '🖥️', name: 'Desktop Computer' }, { icon: '🖨️', name: 'Printer' }, { icon: '📠', name: 'Fax Machine' }, { icon: '📞', name: 'Telephone Receiver' },
  { icon: '📆', name: 'Tear-Off Calendar' }, { icon: '📅', name: 'Calendar' }, { icon: '📮', name: 'Postbox' }, { icon: '📦', name: 'Package' },
  { icon: '🧹', name: 'Broom' }, { icon: '🧺', name: 'Basket' }, { icon: '🧽', name: 'Sponge' }, { icon: '🧼', name: 'Soap' },
  { icon: '✉️', name: 'Envelope' }, { icon: '🧧', name: 'Red Envelope' }, { icon: '⚓', name: 'Anchor' }, { icon: '🎈', name: 'Balloon' },
  { icon: '🍌', name: 'Banana' }, { icon: '🍱', name: 'Bento Box' }, { icon: '📖', name: 'Open Book' }, { icon: '🌵', name: 'Cactus' },
  { icon: '🍰', name: 'Shortcake' }, { icon: '🤙', name: 'Call Me Hand' }, { icon: '📷', name: 'Camera' }, { icon: '🍬', name: 'Candy' },
  { icon: '🎪', name: 'Circus Tent' }, { icon: '🏙️', name: 'Cityscape' }, { icon: '👏', name: 'Clapping Hands' }, { icon: '🤡', name: 'Clown Face' },
  { icon: '🍳', name: 'Cooking' }, { icon: '🐮', name: 'Cow Face' }, { icon: '🐲', name: 'Dragon Face' }, { icon: '🐘', name: 'Elephant' },
  { icon: '🐎', name: 'Horse' }, { icon: '👻', name: 'Ghost' }, { icon: '🦒', name: 'Giraffe' }, { icon: '🍇', name: 'Grapes' },
  { icon: '🎃', name: 'Jack-O-Lantern' }, { icon: '🦁', name: 'Lion' }, { icon: '🔒', name: 'Locked' }, { icon: '🪄', name: 'Magic Wand' },
  { icon: '🐵', name: 'Monkey Face' }, { icon: '🍄', name: 'Mushroom' }, { icon: '🦉', name: 'Owl' }, { icon: '🐼', name: 'Panda' },
  { icon: '🐧', name: 'Penguin' }, { icon: '🚓', name: 'Police Car' }, { icon: '💩', name: 'Pile of Poo' }, { icon: '🐰', name: 'Rabbit Face' },
  { icon: '🌈', name: 'Rainbow' }, { icon: '🤖', name: 'Robot' }, { icon: '🚀', name: 'Rocket' }, { icon: '🌹', name: 'Rose' },
  { icon: '🎅', name: 'Santa Claus' }, { icon: '🦂', name: 'Scorpion' }, { icon: '📜', name: 'Scroll' }, { icon: '🦈', name: 'Shark' },
  { icon: '💀', name: 'Skull' }, { icon: '🐍', name: 'Snake' }, { icon: '⛄', name: 'Snowman' }, { icon: '🕷️', name: 'Spider' },
  { icon: '⭐', name: 'Star' }, { icon: '🌻', name: 'Sunflower' }, { icon: '🏄', name: 'Person Surfing' }, { icon: '⚔️', name: 'Crossed Swords' },
  { icon: '💉', name: 'Syringe' }, { icon: '🍵', name: 'Teacup Without Handle' }, { icon: '🚽', name: 'Toilet' }, { icon: '🍅', name: 'Tomato' },
  { icon: '🎄', name: 'Christmas Tree' }, { icon: '🚚', name: 'Delivery Truck' }, { icon: '🦄', name: 'Unicorn' },
  { icon: '🌋', name: 'Volcano' }, { icon: '🐳', name: 'Spouting Whale' }, { icon: '🐺', name: 'Wolf' }, { icon: '🦓', name: 'Zebra' }
];

export function getWalletBalance(wallet: Wallet, allTransactions: Transaction[]) {
    // Start with the wallet's initial balance from the database
    let balance = wallet.initialBalance || 0;

    // Filter transactions relevant to this wallet
    const relevantTransactions = allTransactions.filter(t => t.wallet === wallet.name);

    // Calculate the net effect of transactions
    const transactionNet = relevantTransactions.reduce((acc, t) => {
        if (t.type === 'income') {
            return acc + t.amount;
        }
        return acc - t.amount;
    }, 0);

    // The live balance is the initial balance plus the net effect of all transactions
    return balance + transactionNet;
}

export function getCategoryDepth(categoryId: string | null, allCategories: Category[]): number {
    if (!categoryId) return 0;
    let depth = 0;
    let current = allCategories.find(c => c.id === categoryId);
    while (current?.parentId) {
        depth++;
        current = allCategories.find(c => c.id === current!.parentId);
        if (depth > 10) break; // Safety break for circular dependencies
    }
    return depth;
}
