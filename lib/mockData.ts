export type ProfitbaseUnit = {
  id: string;
  number: string;
  rooms: number;
  floor: number;
  area: number;
  pricePerM2: number;
  price: number;
  view: string;
  section: string;
  buildingName: string;
  status: string;
  statusHumanized: string;
  hasSpecialOffer: boolean;
  specialOfferName?: string;
  layoutImage?: string;
};

export type ProfitbaseBuilding = {
  id: string;
  name: string;
  floorsTotal: number;
  units: ProfitbaseUnit[];
};

function generateTestUnits(buildingName: string, count: number): ProfitbaseUnit[] {
  const units: ProfitbaseUnit[] = [];
  const rooms = [1, 2, 3, 4];
  const sections = ["А", "Б", "В"];
  const statuses = [
    { status: "available", humanized: "Свободна", color: "white" },
    { status: "available", humanized: "Свободна", color: "white" },
    { status: "available", humanized: "Свободна", color: "white" },
    { status: "sold", humanized: "Продана", color: "gray" },
    { status: "paid_reservation", humanized: "Зарезервирована", color: "yellow" },
  ];

  for (let i = 0; i < count; i++) {
    // Распределяем так чтобы было примерно 12 квартир на этаже
    const floor = Math.floor(i / 12) + 1;
    const unitNumberOnFloor = (i % 12) + 1;
    
    const section = sections[i % sections.length];
    const status = statuses[i % statuses.length];
    const roomsCount = rooms[i % rooms.length];
    const area = 30 + Math.random() * 100;
    const pricePerM2 = 200000 + Math.random() * 50000;
    const price = Math.round(area * pricePerM2);

    units.push({
      id: `${buildingName.replace(/\s/g, "-")}-${i + 1}`,
      number: `${String(floor).padStart(2, "0")}${String(unitNumberOnFloor).padStart(2, "0")}`,
      rooms: roomsCount,
      floor,
      area: Math.round(area * 100) / 100,
      pricePerM2: Math.round(pricePerM2),
      price,
      view: i % 3 === 0 ? "на парк" : i % 3 === 1 ? "на улицу" : "во двор",
      section,
      buildingName,
      status: status.status,
      statusHumanized: status.humanized,
      hasSpecialOffer: i % 5 === 0,
      specialOfferName: i % 5 === 0 ? "Скидка 10%" : undefined,
    });
  }

  return units;
}

export async function getCachedBuildings(): Promise<ProfitbaseBuilding[]> {
  // Генерируем тестовые данные: 4 корпуса по 300 лотов в каждом (25 этажей x 12 квартир)
  return [
    {
      id: "building-1",
      name: "Корпус 1",
      floorsTotal: 25,
      units: generateTestUnits("Корпус 1", 300),
    },
    {
      id: "building-2",
      name: "Корпус 2",
      floorsTotal: 25,
      units: generateTestUnits("Корпус 2", 300),
    },
    {
      id: "building-3",
      name: "Корпус 3",
      floorsTotal: 25,
      units: generateTestUnits("Корпус 3", 300),
    },
    {
      id: "building-4",
      name: "Корпус 4",
      floorsTotal: 25,
      units: generateTestUnits("Корпус 4", 300),
    },
  ];
}
