import type { PoolsData } from './types.js';

export const DEFAULT_POOLS: PoolsData = {
  names: {
    firstNames: [
      'Adrian', 'Alistair', 'Amara', 'Arthur', 'Astrid', 'Atticus', 'Beatrix', 'Bram',
      'Cassian', 'Celeste', 'Clara', 'Corin', 'Cynthia', 'Damian', 'Daphne', 'Dorian',
      'Edgar', 'Eleanor', 'Elias', 'Eliza', 'Emil', 'Esther', 'Evander', 'Fabian',
      'Felicity', 'Gideon', 'Greta', 'Harold', 'Helena', 'Hugo', 'Ingrid', 'Isaac',
      'Jasper', 'Julian', 'Katrina', 'Kieran', 'Leander', 'Lenore', 'Lillian', 'Lucas',
      'Lucian', 'Magnus', 'Marcel', 'Maren', 'Maxim', 'Milo', 'Miriam', 'Nadia',
      'Nathaniel', 'Nora', 'Octavia', 'Orion', 'Percival', 'Quentin', 'Reginald', 'Roland',
      'Rosalind', 'Rowan', 'Sebastian', 'Silas', 'Soren', 'Stella', 'Thaddeus', 'Theodore',
      'Tobias', 'Valerie', 'Victor', 'Vera', 'Walter', 'Wilhelm', 'Xavier', 'Yvaine',
    ],
    surnames: [
      'Adler', 'Althaus', 'Ashford', 'Bancroft', 'Belmont', 'Blackwood', 'Brauer', 'Calloway',
      'Castile', 'Chambers', 'Chen', 'Corbett', 'Cross', 'Cromwell', 'Danforth', 'Delgado',
      'Dunbar', 'Eisen', 'Ellington', 'Faulkner', 'Finch', 'Fitzgerald', 'Frost', 'Garrick',
      'Godfrey', 'Graves', 'Grayson', 'Halloway', 'Harrington', 'Hawthorne', 'Haywood', 'Holt',
      'Ibrahim', 'Keene', 'Kendrick', 'Kessler', 'Kingsley', 'Lancaster', 'Lattimore', 'Leclair',
      'Lockwood', 'MacKenzie', 'Mercer', 'Monroe', 'Montgomery', 'Navarro', 'Oakhaven', 'Orlov',
      'Pendleton', 'Pike', 'Preston', 'Radcliffe', 'Ramsay', 'Roth', 'Sinclair', 'Sterling',
      'Strand', 'Sutherland', 'Talbot', 'Thorne', 'Vance', 'Vaughn', 'Volkov', 'Wainwright',
      'Ward', 'Waverly', 'Webb', 'Whitman', 'Winter', 'Wyatt', 'Yeats', 'Zimmerman',
    ],
  },
  locations: [
    {
      id: 'loc_grand_hotel',
      name: 'The Grand Vesper Hotel',
      description: 'Neoclassical luxury hotel situated north of the central rail terminus.',
      doorIds: ['door_hotel_lobby', 'door_hotel_suite'],
      adjacency: [
        { to: 'loc_central_station', travelMinutes: 15 },
        { to: 'loc_chronicle_newsroom', travelMinutes: 10 },
      ],
    },
    {
      id: 'loc_central_station',
      name: 'Vesper Central Station',
      description: 'Subterranean rail hub connecting municipal lines to northern freight corridors.',
      doorIds: ['door_station_gate', 'door_station_lockers'],
      adjacency: [
        { to: 'loc_grand_hotel', travelMinutes: 15 },
        { to: 'loc_north_dock', travelMinutes: 12 },
      ],
    },
    {
      id: 'loc_chronicle_newsroom',
      name: 'The Vesper Chronicle Newsroom',
      description: 'Editorial offices, library archives, and news telegraph desks.',
      doorIds: ['door_newsroom_press', 'door_newsroom_archives'],
      adjacency: [
        { to: 'loc_grand_hotel', travelMinutes: 10 },
        { to: 'loc_northgate_printshop', travelMinutes: 10 },
      ],
    },
    {
      id: 'loc_northgate_printshop',
      name: 'North Gate Print Shop',
      description: 'Industrial printing press facility with mechanical composing bays and ink tanks.',
      doorIds: ['door_printshop_dock', 'door_printshop_composing'],
      adjacency: [
        { to: 'loc_chronicle_newsroom', travelMinutes: 10 },
        { to: 'loc_north_dock', travelMinutes: 14 },
      ],
    },
    {
      id: 'loc_north_dock',
      name: 'North Freight Dock',
      description: 'Enclosed cargo staging bay equipped with security turnstiles and rolling shutters.',
      doorIds: ['door_dock_turnstile', 'door_dock_bay'],
      adjacency: [
        { to: 'loc_central_station', travelMinutes: 12 },
        { to: 'loc_northgate_printshop', travelMinutes: 14 },
      ],
    },
  ],
  objects: [
    {
      id: 'obj_brass_chronometer',
      name: 'Naval Brass Chronometer',
      description: 'A precision maritime gimbaled clock used for naval charting.',
      type: 'item',
    },
    {
      id: 'obj_cipher_ledger',
      name: 'Transit Cipher Ledger',
      description: 'An encrypted dispatch notebook containing railway junction codes.',
      type: 'item',
    },
    {
      id: 'obj_rotary_press',
      name: 'High-Speed Rotary Press',
      description: 'Industrial steam printing press fitted with optical alignment sensors.',
      type: 'device',
    },
    {
      id: 'obj_dock_scanner',
      name: 'Freight Turnstile Scanner',
      description: 'Card-reading gate terminal recording personnel scans at the North Dock.',
      type: 'device',
    },
  ],
  motives: ['blackmail', 'debt', 'revenge', 'espionage', 'theft', 'coverup'],
  relations: ['colleague', 'rival', 'informant', 'employer', 'confidant', 'accomplice'],
};
