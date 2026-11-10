import type { SvgIconComponent } from '@mui/icons-material';
import AccountBalance from '@mui/icons-material/AccountBalance';
import Apartment from '@mui/icons-material/Apartment';
import AutoAwesome from '@mui/icons-material/AutoAwesome';
import BackHand from '@mui/icons-material/BackHand';
import BatteryChargingFull from '@mui/icons-material/BatteryChargingFull';
import Brush from '@mui/icons-material/Brush';
import Cake from '@mui/icons-material/Cake';
import CameraAlt from '@mui/icons-material/CameraAlt';
import CardGiftcard from '@mui/icons-material/CardGiftcard';
import Category from '@mui/icons-material/Category';
import Celebration from '@mui/icons-material/Celebration';
import Chair from '@mui/icons-material/Chair';
import Checkroom from '@mui/icons-material/Checkroom';
import ChildCare from '@mui/icons-material/ChildCare';
import Church from '@mui/icons-material/Church';
import CleaningServices from '@mui/icons-material/CleaningServices';
import Coffee from '@mui/icons-material/Coffee';
import Construction from '@mui/icons-material/Construction';
import ContentCut from '@mui/icons-material/ContentCut';
import Diamond from '@mui/icons-material/Diamond';
import DirectionsCar from '@mui/icons-material/DirectionsCar';
import DryCleaning from '@mui/icons-material/DryCleaning';
import EditNote from '@mui/icons-material/EditNote';
import EventAvailable from '@mui/icons-material/EventAvailable';
import EventSeat from '@mui/icons-material/EventSeat';
import Explore from '@mui/icons-material/Explore';
import FaceRetouchingNatural from '@mui/icons-material/FaceRetouchingNatural';
import Favorite from '@mui/icons-material/Favorite';
import Festival from '@mui/icons-material/Festival';
import FlightTakeoff from '@mui/icons-material/FlightTakeoff';
import Groups from '@mui/icons-material/Groups';
import Headphones from '@mui/icons-material/Headphones';
import Hotel from '@mui/icons-material/Hotel';
import Icecream from '@mui/icons-material/Icecream';
import Lightbulb from '@mui/icons-material/Lightbulb';
import LocalBar from '@mui/icons-material/LocalBar';
import LocalFlorist from '@mui/icons-material/LocalFlorist';
import LocationOn from '@mui/icons-material/LocationOn';
import Mail from '@mui/icons-material/Mail';
import MedicalServices from '@mui/icons-material/MedicalServices';
import MeetingRoom from '@mui/icons-material/MeetingRoom';
import Mic from '@mui/icons-material/Mic';
import Palette from '@mui/icons-material/Palette';
import Person from '@mui/icons-material/Person';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import Psychology from '@mui/icons-material/Psychology';
import Restaurant from '@mui/icons-material/Restaurant';
import Security from '@mui/icons-material/Security';
import SelfImprovement from '@mui/icons-material/SelfImprovement';
import ShoppingBasket from '@mui/icons-material/ShoppingBasket';
import Spa from '@mui/icons-material/Spa';
import Speaker from '@mui/icons-material/Speaker';
import SupportAgent from '@mui/icons-material/SupportAgent';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Videocam from '@mui/icons-material/Videocam';
import VideoLibrary from '@mui/icons-material/VideoLibrary';
import Weekend from '@mui/icons-material/Weekend';
import Wifi from '@mui/icons-material/Wifi';

/**
 * Icon per production category, keyed by the *normalised name* (see
 * `normaliseCategoryName`).
 *
 * Matched by name, not by `service_categories.key`: the names are what the
 * product team curates and what this list was specified against, while the keys
 * are DB slugs this file would otherwise have to guess. A category added in the
 * admin portal that isn't listed here simply gets `FALLBACK_ICON` — the row
 * never breaks, it just looks generic until someone adds a line.
 *
 * Deep imports (not `@sinnapi/ui/icons`) so only these ~55 icons are bundled —
 * see the web-public dev-perf note on the icon barrel.
 */
const ICONS_BY_NAME: Record<string, SvgIconComponent> = {
  'Affordable housing': Apartment,
  Airbnb: Hotel,
  Beauticians: FaceRetouchingNatural,
  'Bridal shoes & accessories': Diamond,
  Cakes: Cake,
  Caterer: Restaurant,
  'Cleaning services': CleaningServices,
  'Content creators': VideoLibrary,
  Counseling: Psychology,
  Decorator: Palette,
  Dentists: MedicalServices,
  DJ: Headphones,
  'Entertainment Provider': Celebration,
  'Event Equipment Supplier': Construction,
  'Event rentals': EventSeat,
  'Favors(Smoke, fireworks & props)': AutoAwesome,
  'Fertility specialists': Spa,
  Financier: AccountBalance,
  Florist: LocalFlorist,
  // `Nutrition` / `Camping` are not in the installed @mui/icons-material.
  Fruits: ShoppingBasket,
  'Furniture rentals': Chair,
  'Gift packaging': CardGiftcard,
  Gowns: Checkroom,
  'Hair stylists': ContentCut,
  'Honeymoon destinations': FlightTakeoff,
  Icecream: Icecream,
  Insurance: VerifiedUser,
  'Interior Designers': Weekend,
  'Internet provider': Wifi,
  Invitations: Mail,
  Jeweler: Diamond,
  'Juice & beverages': LocalBar,
  'Kids play (bouncing castles, swings, face art etc)': ChildCare,
  'Lighting, trussing & production': Lightbulb,
  'Lingerie & intimates': Favorite,
  'Makeup Artist': Brush,
  MC: Mic,
  'Meeting venues': MeetingRoom,
  'Mobile charging': BatteryChargingFull,
  'Nail technicians/ manicurists': BackHand,
  'Officiant/Church': Church,
  PA: Speaker,
  'Photo booths': PhotoCamera,
  Photographer: CameraAlt,
  'Security Company': Security,
  Stationery: EditNote,
  Suits: Person,
  'Tea & coffee': Coffee,
  'Tents, parasols & shelters': Festival,
  'Tour guide': Explore,
  'Traditional Attire': DryCleaning,
  Transportation: DirectionsCar,
  Ushering: SupportAgent,
  'Vendor management': Groups,
  Venue: LocationOn,
  Videographer: Videocam,
  'Wedding planner': EventAvailable,
  'Wellness & Spa': SelfImprovement,
};

/**
 * Lower-cased, letters and digits only. Makes the lookup immune to the things
 * that differ between an admin typing a name and a spec listing it: casing,
 * `Favors(Smoke` vs `Favors (Smoke`, `technicians/ manicurists` spacing.
 */
export function normaliseCategoryName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const NORMALISED = new Map(
  Object.entries(ICONS_BY_NAME).map(([name, icon]) => [normaliseCategoryName(name), icon]),
);

export const FALLBACK_ICON: SvgIconComponent = Category;

export function iconForCategory(name: string): SvgIconComponent {
  return NORMALISED.get(normaliseCategoryName(name)) ?? FALLBACK_ICON;
}
