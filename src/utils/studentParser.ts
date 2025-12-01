/**
 * Advanced Student Data Parser
 * Extracts batch year and department from userid patterns
 * Pattern: 99YYXDDZZZZ
 * - YY = batch year (22 = 2022, 24 = 2024)
 * - X = unknown/variable
 * - DD = department code (08 = IT, 04 = CSE, 00 = other)
 */

export interface StudentInfo {
  year: number | null;
  yearShort: string | null;
  department: string | null;
  deptCode: string | null;
  batch: string;
  isValid: boolean;
}

const DEPT_MAP: Record<string, string> = {
  '08': 'IT',
  '04': 'CSE',
  '00': 'General',
  '01': 'ECE',
  '02': 'EEE',
  '03': 'MECH',
  '05': 'CIVIL',
  '06': 'CHEM',
  '07': 'MBA',
  '09': 'MCA',
};

export function parseStudentId(userid: string | null | undefined): StudentInfo {
  const defaultInfo: StudentInfo = {
    year: null,
    yearShort: null,
    department: null,
    deptCode: null,
    batch: 'Unknown',
    isValid: false,
  };

  if (!userid || typeof userid !== 'string') return defaultInfo;

  const cleaned = userid.trim();
  
  // Pattern: 99YYXDDZZZZ (10+ digits starting with 99)
  const match = cleaned.match(/^99(\d{2})\d(\d{2})\d+$/);
  
  if (!match) return defaultInfo;

  const [, yearShort, deptCode] = match;
  
  // Convert year: 22 -> 2022, 24 -> 2024, etc.
  const year = parseInt(yearShort, 10);
  const fullYear = year >= 0 && year <= 99 ? 2000 + year : null;
  
  const department = DEPT_MAP[deptCode] || 'Other';
  
  const batch = fullYear && department !== 'Other'
    ? `B.Tech ${department} ${fullYear} Batch`
    : fullYear
    ? `${fullYear} Batch`
    : 'Unknown Batch';

  return {
    year: fullYear,
    yearShort,
    department,
    deptCode,
    batch,
    isValid: true,
  };
}

export function getBatchYears(userids: (string | null | undefined)[]): number[] {
  const years = new Set<number>();
  userids.forEach(id => {
    const info = parseStudentId(id);
    if (info.year) years.add(info.year);
  });
  return Array.from(years).sort((a, b) => b - a); // descending
}

export function getDepartments(userids: (string | null | undefined)[]): string[] {
  const depts = new Set<string>();
  userids.forEach(id => {
    const info = parseStudentId(id);
    if (info.department && info.department !== 'Other') depts.add(info.department);
  });
  return Array.from(depts).sort();
}
