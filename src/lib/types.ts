export type PropertyStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'rented'
  | 'sold';

export interface PropertyImage {
  id: number;
  url: string;
}

export interface Property {
  id: number;
  code?: string | null;
  title: string;
  description?: string | null;
  type: string;
  purpose?: string | null;
  status: PropertyStatus;
  price: number;
  price_sale?: number | null;
  price_rent?: number | null;
  promotion_price?: number | null;
  promotional_rent_price?: number | null;
  address?: string | null;
  quadra?: string | null;
  lote?: string | null;
  numero?: string | null;
  bairro?: string | null;
  complemento?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
  sem_cep?: number | boolean | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_construida?: number | null;
  area_construida_unidade?: 'm2' | 'hectare' | 'alqueire' | null;
  area_terreno?: number | null;
  area_terreno_unidade?: 'm2' | 'hectare' | 'alqueire' | null;
  area_construida_valor?: number | null;
  area_terreno_valor?: number | null;
  area_construida_m2?: number | null;
  area_terreno_m2?: number | null;
  public_code?: string | null;
  public_id?: number | null;
  garage_spots?: number | null;
  amenities?: string[] | null;
  has_wifi?: boolean;
  tem_piscina?: boolean;
  tem_energia_solar?: boolean;
  tem_automacao?: boolean;
  tem_ar_condicionado?: boolean;
  eh_mobiliada?: boolean;
  valor_condominio?: number | null;
  video_url?: string | null;
  sale_value?: number | null;
  commission_value?: number | null;
  commission_rate?: number | null;
  broker_id?: number | null;
  owner_id?: number | null;
  owner_name?: string | null;
  owner_phone?: string | null;
  broker_name?: string | null;
  broker_phone?: string | null;
  broker_status?: string | null;
  broker_creci?: string | null;
  created_at?: string;
  updated_at?: string;
  images?: PropertyImage[];
}

export interface Agency {
  id?: number | null;
  name?: string | null;
  logo_url?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface BrokerDocuments {
  creci_front_url?: string | null;
  creci_back_url?: string | null;
  selfie_url?: string | null;
}

export interface Broker {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  creci: string;
  status: 'pending_verification' | 'approved' | 'rejected';
  created_at: string;
  property_count?: number;
  agency?: Agency | null;
  documents?: BrokerDocuments;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface Notification {
  id: number;
  message: string;
  related_entity_type:
    | 'property'
    | 'broker'
    | 'agency'
    | 'user'
    | 'announcement'
    | 'negotiation'
    | 'other';
  related_entity_id: number | null;
  recipient_id?: number | null;
  metadata_json?:
    | {
        clientPhone?: string | null;
        clientPhoneRaw?: string | null;
        clientEmail?: string | null;
        whatsappUrl?: string | null;
        [key: string]: unknown;
      }
    | string
    | null;
  is_read: boolean | 0 | 1;
  created_at: string;
}

export type View =
  | 'dashboard'
  | 'properties'
  | 'property_highlights'
  | 'property_requests'
  | 'sold_properties'
  | 'negotiation_requests'
  | 'negotiation_progress'
  | 'negotiation_contracts'
  | 'commissions'
  | 'create_property'
  | 'create_user'
  | 'brokers'
  | 'clients'
  | 'administrative_assistants'
  | 'verification'
  | 'notifications';

export type NotificationsSubTab = 'send' | 'center' | 'announcements';

export type DataItem = Property | Broker | User;

export interface ViewConfig {
  title: string;
  endpoint?: string;
  headers?: string[];
  filterOptions?: { value: string; label: string }[];
  sortColumn?: string;
}
