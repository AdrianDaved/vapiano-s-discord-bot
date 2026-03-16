/**
 * Script de migración: importa reputaciones desde YAGPDB al bot.
 * Ejecutar una sola vez con:  npx tsx src/scripts/importRep.ts
 */

import prisma from '../database/client';

const GUILD_ID = '1420045220325625898';
const SYSTEM_GIVER = '0'; // ID ficticio para reps "heredadas"

const leaderboard = [
  { userId: '1348480475575881740', points: 37 },
  { userId: '392519486596579338',  points: 14 },
  { userId: '1414046264558878841', points: 7  },
  { userId: '1178760849880522883', points: 6  },
  { userId: '787324748291244073',  points: 4  },
  { userId: '1468873195875467359', points: 3  },
  { userId: '740630491627126865',  points: 3  },
  { userId: '909880231203061842',  points: 3  },
  { userId: '1321682391751725078', points: 3  },
  { userId: '1310322305473318912', points: 2  },
  { userId: '590620682295967744',  points: 2  },
  { userId: '718166966048915566',  points: 2  },
  { userId: '701557429158281317',  points: 2  },
  { userId: '1422073029797875762', points: 2  },
  { userId: '1438361558475608148', points: 2  },
  { userId: '829705095721255003',  points: 2  },
  { userId: '816715088043966506',  points: 2  },
  { userId: '823271763894730763',  points: 2  },
  { userId: '246744976816472065',  points: 1  },
  { userId: '1110673320413777941', points: 1  },
  { userId: '1235418631857246272', points: 1  },
  { userId: '1238708636167966841', points: 1  },
  { userId: '1243990418291429477', points: 1  },
  { userId: '1250482971341754493', points: 1  },
  { userId: '1365109875243352146', points: 1  },
  { userId: '1421718493723627621', points: 1  },
  { userId: '1462969890414657629', points: 1  },
  { userId: '1463704350009589873', points: 1  },
  { userId: '1105249076578095134', points: 1  },
  { userId: '314918742406463498',  points: 1  },
  { userId: '349544854025666561',  points: 1  },
  { userId: '395294689265188864',  points: 1  },
  { userId: '472626841627394058',  points: 1  },
  { userId: '496290349413695500',  points: 1  },
  { userId: '547840418965094400',  points: 1  },
  { userId: '562433415371292683',  points: 1  },
  { userId: '751581317841551360',  points: 1  },
  { userId: '754522070666182757',  points: 1  },
  { userId: '776309492601192461',  points: 1  },
  { userId: '852762041772670997',  points: 1  },
  { userId: '881331920796004422',  points: 1  },
  { userId: '927050707788505098',  points: 1  },
  { userId: '934196943939334174',  points: 1  },
  { userId: '1069699393638367293', points: 1  },
  { userId: '1070431927380738110', points: 1  },
  { userId: '1100449279790809261', points: 1  },
];

async function main() {
  // Asegurarse de que el GuildConfig exista
  await prisma.guildConfig.upsert({
    where: { id: GUILD_ID },
    update: {},
    create: { id: GUILD_ID },
  });

  let total = 0;

  for (const entry of leaderboard) {
    const rows = Array.from({ length: entry.points }, () => ({
      guildId: GUILD_ID,
      userId: entry.userId,
      giverId: SYSTEM_GIVER,
      reason: 'Migrado desde YAGPDB',
    }));

    await prisma.reputation.createMany({ data: rows });
    total += entry.points;
    console.log(`✓ ${entry.userId} — ${entry.points} rep`);
  }

  console.log(`\nImportación completa: ${total} entradas para ${leaderboard.length} usuarios.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
