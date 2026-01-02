import { Player, Team } from "./types";

export const INITIAL_BUDGET = 6000; // In Rupees

export const INITIAL_TEAMS: Team[] = [
  {
    id: "1",
    name: "Royal Strikers",
    budget: INITIAL_BUDGET,
    initialBudget: INITIAL_BUDGET,
    players: [],
    color: "bg-red-600",
    logo: "https://img.freepik.com/free-vector/sport-logo-design_23-2148472448.jpg?w=200",
  },
  {
    id: "2",
    name: "Knight Riders",
    budget: INITIAL_BUDGET,
    initialBudget: INITIAL_BUDGET,
    players: [],
    color: "bg-purple-700",
    logo: "https://img.freepik.com/free-vector/eagle-sport-mascot-logo-design_23-2148464645.jpg?w=200",
  },
  {
    id: "3",
    name: "Super Kings",
    budget: INITIAL_BUDGET,
    initialBudget: INITIAL_BUDGET,
    players: [],
    color: "bg-yellow-400",
    logo: "https://img.freepik.com/free-vector/lion-sport-mascot-logo-design_23-2148482444.jpg?w=200",
  },
  {
    id: "4",
    name: "Sunrisers",
    budget: INITIAL_BUDGET,
    initialBudget: INITIAL_BUDGET,
    players: [],
    color: "bg-orange-500",
    logo: "https://img.freepik.com/free-vector/bird-mascot-logo-design_23-2148482445.jpg?w=200",
  },
  {
    id: "5",
    name: "Mumbai Titans",
    budget: INITIAL_BUDGET,
    initialBudget: INITIAL_BUDGET,
    players: [],
    color: "bg-blue-600",
    logo: "https://img.freepik.com/free-vector/shield-sport-logo-design_23-2148474447.jpg?w=200",
  },
  {
    id: "6",
    name: "Capital Stars",
    budget: INITIAL_BUDGET,
    initialBudget: INITIAL_BUDGET,
    players: [],
    color: "bg-sky-500",
    logo: "https://img.freepik.com/free-vector/star-sport-logo-design_23-2148476449.jpg?w=200",
  },
];

export const INITIAL_PLAYERS: Player[] = [
  {
    id: "p1",
    name: "Virat Kohli",
    club: "Strikers",
    type: "Batsman",
    basePrice: 50,
    rating: 95,
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=400&fit=crop",
    isSold: false,
  },
  {
    id: "p2",
    name: "Jasprit Bumrah",
    club: "Titans",
    type: "Bowler",
    basePrice: 50,
    rating: 94,
    image:
      "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=400&h=400&fit=crop",
    isSold: false,
  },
  {
    id: "p3",
    name: "Hardik Pandya",
    club: "Titans",
    type: "All-rounder",
    basePrice: 50,
    rating: 92,
    image:
      "https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=400&h=400&fit=crop",
    isSold: false,
  },
];
