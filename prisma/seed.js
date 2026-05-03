const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function hashPassword(password) {
  const iterations = 120000;
  const salt = crypto.randomBytes(16).toString('base64url');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

const demoPasswordHash = hashPassword('semesterly-demo');

const day = 24 * 60 * 60 * 1000;
const due = (offset, hour = 17) => {
  const d = new Date(Date.now() + offset * day);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const students = [
  ['emma', 'Emma Rodriguez', 'Texas A&M University', 'Sophomore', 'Biology', [['BIOL 111','Intro Biology',5], ['CHEM 120','General Chemistry',5]], [['Lab Report 2',0,120,5,'IN_PROGRESS'], ['Problem Set 3',1,90,4,'NOT_STARTED']], [['Study Group',1,'STUDY'], ['Gym',5,'PERSONAL']]],
  ['liam', 'Liam Chen', 'UT Austin', 'Junior', 'Computer Science', [['CS 314','Data Structures',5], ['MATH 341','Linear Algebra',4]], [['Coding Project 1',6,300,5,'IN_PROGRESS'], ['HW 5',3,120,4,'NOT_STARTED']], [['Hackathon Prep',6,'CLUB'], ['Part-time Shift',3,'WORK']]],
  ['ava', 'Ava Patel', 'Baylor University', 'Freshman', 'Nursing', [['NURS 130','Foundations',5], ['PSYC 1301','Intro Psych',4]], [['Reflection Essay',5,60,4,'DONE'], ['Quiz Prep',2,45,3,'IN_PROGRESS']], [['Church Group',7,'PERSONAL'], ['Study Time',3,'STUDY']]],
  ['noah', 'Noah Williams', 'Texas Tech', 'Senior', 'Finance', [['FIN 332','Investments',5], ['ACCT 230','Accounting',5]], [['Stock Analysis',5,180,5,'IN_PROGRESS'], ['Midterm Study',1,120,5,'NOT_STARTED']], [['Internship Shift',2,'WORK'], ['Basketball',4,'PERSONAL']]],
  ['sophia', 'Sophia Martinez', 'University of Houston', 'Junior', 'Marketing', [['MKTG 333','Consumer Behavior',4], ['COMM 130','Public Speaking',3]], [['Presentation Slides',4,90,4,'IN_PROGRESS'], ['Case Study',7,150,5,'NOT_STARTED']], [['Club Meeting',3,'CLUB'], ['Work Shift',6,'WORK']]],
  ['ethan','Ethan Brown','Texas State','Sophomore','Psychology', [['PSYC 230','Cognitive Psych',5], ['STAT 201','Statistics',4]], [['Data Analysis',4,120,5,'IN_PROGRESS'], ['Reading Notes',3,60,3,'DONE']], [['Therapy Club',2,'CLUB'], ['Jogging',5,'PERSONAL']]],
  ['olivia','Olivia Davis','Rice University','Senior','Physics', [['PHYS 401','Quantum Mechanics',5], ['MATH 410','Differential Equations',5]], [['Problem Set',5,240,5,'IN_PROGRESS'], ['HW',4,120,4,'NOT_STARTED']], [['Research Lab',3,'WORK'], ['Study Group',7,'STUDY']]],
  ['mason','Mason Johnson','Texas A&M','Freshman','Engineering', [['ENGR 102','Engineering',5], ['CALC 151','Calculus',5]], [['Coding Task',7,180,5,'NOT_STARTED'], ['Calc HW',2,90,5,'IN_PROGRESS']], [['Tutoring',3,'STUDY'], ['Gaming Night',6,'PERSONAL']]],
  ['isabella','Isabella Moore','SMU','Junior','Journalism', [['JOUR 301','Reporting',5], ['LAW 220','Media Law',4]], [['Article Draft',5,120,5,'IN_PROGRESS']], [['Newspaper Meeting',3,'CLUB']]],
  ['james','James Taylor','UT Dallas','Senior','IT', [['ITS 430','Cybersecurity',5], ['DB 330','Databases',4]], [['Security Lab',7,180,5,'NOT_STARTED']], [['IT Job',2,'WORK']]],
  ['mia','Mia Anderson','Baylor','Sophomore','Education', [['EDU 210','Teaching Methods',4], ['DEV 220','Child Dev',4]], [['Lesson Plan',4,90,4,'IN_PROGRESS']], [['Classroom Observation',5,'WORK']]],
  ['benjamin','Benjamin Thomas','Texas Tech','Junior','Architecture', [['ARCH 301','Design Studio',5], ['ARCH 220','History',3]], [['Model Build',7,300,5,'IN_PROGRESS']], [['Studio Time',6,'STUDY']]],
  ['charlotte','Charlotte Jackson','UH','Freshman','English', [['ENGL 130','Lit',4], ['WRIT 101','Writing',4]], [['Essay',5,120,4,'NOT_STARTED']], [['Book Club',4,'CLUB']]],
  ['lucas','Lucas White','Texas State','Senior','Kinesiology', [['KIN 330','Exercise Science',4], ['NUTR 210','Nutrition',3]], [['Diet Plan',3,60,3,'DONE']], [['Gym Training',1,'PERSONAL']]],
  ['amelia','Amelia Harris','Rice','Junior','Chemistry', [['CHEM 301','Organic Chem',5], ['CHEM 311','Lab',5]], [['Lab Report',1,180,5,'IN_PROGRESS']], [['Research',2,'WORK']]],
  ['elijah','Elijah Martin','UT Austin','Sophomore','Economics', [['ECON 301','Microeconomics',4], ['STAT 309','Stats',4]], [['Problem Set',4,120,4,'NOT_STARTED']], [['Debate Club',3,'CLUB']]],
  ['harper','Harper Thompson','Texas A&M','Senior','Animal Science', [['ANSC 320','Animal Nutrition',5], ['GEN 210','Genetics',4]], [['Case Study',5,150,5,'IN_PROGRESS']], [['Farm Work',6,'WORK']]],
  ['alexander','Alexander Garcia','SMU','Freshman','Business', [['BUS 101','Intro Business',3], ['ACCT 101','Accounting',4]], [['Quiz Prep',2,60,3,'DONE']], [['Networking Event',4,'CLUB']]],
  ['evelyn','Evelyn Martinez','UT Dallas','Junior','Graphic Design', [['ART 330','Design Studio',5], ['TYPO 220','Typography',4]], [['Poster Project',7,180,5,'IN_PROGRESS']], [['Freelance Work',5,'WORK']]],
  ['daniel','Daniel Robinson','Baylor','Sophomore','History', [['HIST 230','US History',4], ['POLS 210','Political Science',4]], [['Essay Draft',3,120,4,'NOT_STARTED']], [['Study Session',1,'STUDY']]],
];

async function main() {
  await prisma.adminAuditLog.deleteMany();
  await prisma.event.deleteMany();
  await prisma.task.deleteMany();
  await prisma.courseMeeting.deleteMany();
  await prisma.course.deleteMany();
  await prisma.term.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({ data: { id: 'dom-admin', name: 'Dom Admin', email: 'admin@semesterly.local', passwordHash: hashPassword('semesterly-admin'), role: 'ADMIN', timezone: 'America/Chicago' } });

  for (const [id, name, school, year, major, courses, tasks, events] of students) {
    await prisma.user.create({ data: { id, name, email: `${id}@semesterly.local`, passwordHash: demoPasswordHash, school, year, major, timezone: 'America/Chicago' } });
    for (let i = 0; i < courses.length; i++) {
      const [code, name, importance] = courses[i];
      await prisma.course.create({ data: { id: `${id}-course-${i}`, userId: id, code, name, importance, color: i ? '#188038' : '#1a73e8' } });
    }
    for (let i = 0; i < tasks.length; i++) {
      const [title, offset, minutes, importance, status] = tasks[i];
      await prisma.task.create({ data: { userId: id, courseId: `${id}-course-${Math.min(i, courses.length - 1)}`, title, dueAt: due(offset), estimatedMinutes: minutes, importance, status } });
    }
    for (let i = 0; i < events.length; i++) {
      const [title, offset, category] = events[i];
      const startsAt = due(offset, 16 + i);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
      await prisma.event.create({ data: { userId: id, courseId: `${id}-course-${Math.min(i, courses.length - 1)}`, title, startsAt, endsAt, category } });
    }
  }
}

main().then(() => prisma.$disconnect()).catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
