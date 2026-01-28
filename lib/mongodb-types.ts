/**
 * MongoDB Collections Schema для TEMPO Nova
 */

export interface Unit {
  _id?: string;
  complexId: string;
  buildingId: string;
  
  number: string; // "101", "А-205"
  floor: number;
  type: string; // "2-к.кв", "Студия"
  area: number; // м²
  price: number; // ₽
  pricePerM2: number; // ₽/м²
  view: string; // "Двор", "Парк"
  image?: string; // URL планировки
  
  status: string; // "available", "sold", "paid_reservation"
  statusHumanized: string;
  
  hasSpecialOffer: boolean;
  specialOfferName?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Building {
  _id?: string;
  complexId: string;
  
  name: string; // "Корпус 1"
  hanOverDate?: string; // "Q4 2026"
  isDelivered?: boolean;
  floorsTotal: number;
  chessOrderBy?: string; // Сортировка в шахматке
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Complex {
  _id?: string;
  
  name: string; // "ТЕМПО Nova"
  feedUrl?: string; // URL XML фида
  lastSyncedAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedSync {
  _id?: string;
  complexId: string;
  
  feedUrl: string;
  status: "pending" | "success" | "error";
  error?: string;
  
  unitsCreated: number;
  unitsUpdated: number;
  buildingsProcessed: number;
  
  startedAt: Date;
  completedAt?: Date;
}
