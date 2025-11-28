import { Mountain } from './types';

// The 24 Mountains circle starts at North (0 degrees is usually North in mapping, but in Feng Shui charts South is often up.
// Here we adhere to standard geographic North = 0/360 for map alignment).
// However, the standard 24 mountain starts with Ren (N1) at 337.5 to 352.5.

export const MOUNTAINS: Mountain[] = [
  { id: 'n1', chineseName: '壬', pinyin: 'Ren', name: 'Жэнь (С1)', element: 'Water', direction: 'N1', startDegree: 337.5, endDegree: 352.5, description: 'Вода Ян, Крыса' },
  { id: 'n2', chineseName: '子', pinyin: 'Zi', name: 'Цзы (С2)', element: 'Water', direction: 'N2', startDegree: 352.5, endDegree: 7.5, description: 'Вода Инь, Император' },
  { id: 'n3', chineseName: '癸', pinyin: 'Gui', name: 'Гуй (С3)', element: 'Water', direction: 'N3', startDegree: 7.5, endDegree: 22.5, description: 'Вода Инь' },

  { id: 'ne1', chineseName: '丑', pinyin: 'Chou', name: 'Чоу (СВ1)', element: 'Earth', direction: 'NE1', startDegree: 22.5, endDegree: 37.5, description: 'Земля Инь, Бык' },
  { id: 'ne2', chineseName: '艮', pinyin: 'Gen', name: 'Гэнь (СВ2)', element: 'Earth', direction: 'NE2', startDegree: 37.5, endDegree: 52.5, description: 'Триграмма Гора' },
  { id: 'ne3', chineseName: '寅', pinyin: 'Yin', name: 'Инь (СВ3)', element: 'Wood', direction: 'NE3', startDegree: 52.5, endDegree: 67.5, description: 'Дерево Ян, Тигр' },

  { id: 'e1', chineseName: '甲', pinyin: 'Jia', name: 'Цзя (В1)', element: 'Wood', direction: 'E1', startDegree: 67.5, endDegree: 82.5, description: 'Дерево Ян' },
  { id: 'e2', chineseName: '卯', pinyin: 'Mao', name: 'Мао (В2)', element: 'Wood', direction: 'E2', startDegree: 82.5, endDegree: 97.5, description: 'Дерево Инь, Кролик' },
  { id: 'e3', chineseName: '乙', pinyin: 'Yi', name: 'И (В3)', element: 'Wood', direction: 'E3', startDegree: 97.5, endDegree: 112.5, description: 'Дерево Инь' },

  { id: 'se1', chineseName: '辰', pinyin: 'Chen', name: 'Чэнь (ЮВ1)', element: 'Earth', direction: 'SE1', startDegree: 112.5, endDegree: 127.5, description: 'Земля Ян, Дракон' },
  { id: 'se2', chineseName: '巽', pinyin: 'Xun', name: 'Сюнь (ЮВ2)', element: 'Wood', direction: 'SE2', startDegree: 127.5, endDegree: 142.5, description: 'Триграмма Ветер' },
  { id: 'se3', chineseName: '巳', pinyin: 'Si', name: 'Сы (ЮВ3)', element: 'Fire', direction: 'SE3', startDegree: 142.5, endDegree: 157.5, description: 'Огонь Ян, Змея' },

  { id: 's1', chineseName: '丙', pinyin: 'Bing', name: 'Бин (Ю1)', element: 'Fire', direction: 'S1', startDegree: 157.5, endDegree: 172.5, description: 'Огонь Ян' },
  { id: 's2', chineseName: '午', pinyin: 'Wu', name: 'У (Ю2)', element: 'Fire', direction: 'S2', startDegree: 172.5, endDegree: 187.5, description: 'Огонь Инь, Лошадь' },
  { id: 's3', chineseName: '丁', pinyin: 'Ding', name: 'Дин (Ю3)', element: 'Fire', direction: 'S3', startDegree: 187.5, endDegree: 202.5, description: 'Огонь Инь' },

  { id: 'sw1', chineseName: '未', pinyin: 'Wei', name: 'Вэй (ЮЗ1)', element: 'Earth', direction: 'SW1', startDegree: 202.5, endDegree: 217.5, description: 'Земля Инь, Коза' },
  { id: 'sw2', chineseName: '坤', pinyin: 'Kun', name: 'Кунь (ЮЗ2)', element: 'Earth', direction: 'SW2', startDegree: 217.5, endDegree: 232.5, description: 'Триграмма Земля' },
  { id: 'sw3', chineseName: '申', pinyin: 'Shen', name: 'Шэнь (ЮЗ3)', element: 'Metal', direction: 'SW3', startDegree: 232.5, endDegree: 247.5, description: 'Металл Ян, Обезьяна' },

  { id: 'w1', chineseName: '庚', pinyin: 'Geng', name: 'Гэн (З1)', element: 'Metal', direction: 'W1', startDegree: 247.5, endDegree: 262.5, description: 'Металл Ян' },
  { id: 'w2', chineseName: '酉', pinyin: 'You', name: 'Ю (З2)', element: 'Metal', direction: 'W2', startDegree: 262.5, endDegree: 277.5, description: 'Металл Инь, Петух' },
  { id: 'w3', chineseName: '辛', pinyin: 'Xin', name: 'Синь (З3)', element: 'Metal', direction: 'W3', startDegree: 277.5, endDegree: 292.5, description: 'Металл Инь' },

  { id: 'nw1', chineseName: '戌', pinyin: 'Xu', name: 'Сюй (СЗ1)', element: 'Earth', direction: 'NW1', startDegree: 292.5, endDegree: 307.5, description: 'Земля Ян, Собака' },
  { id: 'nw2', chineseName: '乾', pinyin: 'Qian', name: 'Цянь (СЗ2)', element: 'Metal', direction: 'NW2', startDegree: 307.5, endDegree: 322.5, description: 'Триграмма Небо' },
  { id: 'nw3', chineseName: '亥', pinyin: 'Hai', name: 'Хай (СЗ3)', element: 'Water', direction: 'NW3', startDegree: 322.5, endDegree: 337.5, description: 'Вода Ян, Свинья' },
];