import type { TeamAbbr } from "./types";

export interface TeamStaff {
  team: TeamAbbr;
  executive: string;
  headCoach: string;
}

/**
 * Current GM-equivalent basketball decision-makers and head coaches.
 * NBA front-office titles vary by team, so `executive` is the person with
 * final basketball personnel authority rather than only people titled "GM".
 */
export const LEAGUE_STAFF: TeamStaff[] = [
  { team: "ATL", executive: "Onsi Saleh", headCoach: "Quin Snyder" },
  { team: "BOS", executive: "Brad Stevens", headCoach: "Joe Mazzulla" },
  { team: "BKN", executive: "Sean Marks", headCoach: "Jordi Fernández" },
  { team: "CHA", executive: "Jeff Peterson", headCoach: "Charles Lee" },
  { team: "CHI", executive: "Bryson Graham", headCoach: "Tiago Splitter" },
  { team: "CLE", executive: "Koby Altman", headCoach: "Kenny Atkinson" },
  { team: "DAL", executive: "Masai Ujiri", headCoach: "Dusty May" },
  { team: "DEN", executive: "Ben Tenzer", headCoach: "David Adelman" },
  { team: "DET", executive: "Trajan Langdon", headCoach: "J.B. Bickerstaff" },
  {
    team: "GSW",
    executive: "Mike Dunleavy Jr.",
    headCoach: "Steve Kerr",
  },
  { team: "HOU", executive: "Rafael Stone", headCoach: "Ime Udoka" },
  { team: "IND", executive: "Kevin Pritchard", headCoach: "Rick Carlisle" },
  { team: "LAC", executive: "Lawrence Frank", headCoach: "Tyronn Lue" },
  { team: "LAL", executive: "Rob Pelinka", headCoach: "JJ Redick" },
  { team: "MEM", executive: "Zach Kleiman", headCoach: "Tuomas Iisalo" },
  { team: "MIA", executive: "Pat Riley", headCoach: "Erik Spoelstra" },
  { team: "MIL", executive: "Jon Horst", headCoach: "Taylor Jenkins" },
  { team: "MIN", executive: "Tim Connelly", headCoach: "Chris Finch" },
  { team: "NOP", executive: "Joe Dumars", headCoach: "Jamahl Mosley" },
  { team: "NYK", executive: "Leon Rose", headCoach: "Mike Brown" },
  {
    team: "OKC",
    executive: "Sam Presti",
    headCoach: "Mark Daigneault",
  },
  { team: "ORL", executive: "Jeff Weltman", headCoach: "Sean Sweeney" },
  { team: "PHI", executive: "Mike Gansey", headCoach: "Nick Nurse" },
  { team: "PHX", executive: "Brian Gregory", headCoach: "Jordan Ott" },
  { team: "POR", executive: "Joe Cronin", headCoach: "Micah Nori" },
  { team: "SAC", executive: "Scott Perry", headCoach: "Doug Christie" },
  { team: "SAS", executive: "Brian Wright", headCoach: "Mitch Johnson" },
  {
    team: "TOR",
    executive: "Bobby Webster",
    headCoach: "Darko Rajaković",
  },
  { team: "UTA", executive: "Austin Ainge", headCoach: "Will Hardy" },
  { team: "WAS", executive: "Will Dawkins", headCoach: "Brian Keefe" },
];

export const LEAGUE_STAFF_UPDATED_AT = "2026-07-28";
