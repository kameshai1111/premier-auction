
export type PlayerType = 'Batsman' | 'Bowler' | 'All-rounder' | 'Forward' | 'Midfielder' | 'Defender' | 'Goalkeeper';

export interface Player {
  id: string;
  name: string;
  club: string;
  type: PlayerType;
  basePrice: number;
  rating: number;
  image: string;
  isSold: boolean;
  soldToId?: string;
  soldToName?: string;
  soldPrice?: number;
}

export interface Team {
  id: string;
  name: string;
  budget: number;
  initialBudget: number;
  players: Player[];
  color: string;
  logo?: string;
}

export interface AuctionState {
  currentPlayer: Player | null;
  currentBid: number;
  highestBidderId: string | null;
  status: 'IDLE' | 'BIDDING' | 'SOLD';
  scoutReport: string;
}
