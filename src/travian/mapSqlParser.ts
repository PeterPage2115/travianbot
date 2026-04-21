export interface ParsedMapRow {
  internalId: number;
  x: number;
  y: number;
  tribeId: number;
  villageId: number;
  villageName: string;
  playerId: number;
  playerName: string;
  allianceId: number;
  allianceTag: string;
  population: number;
  region: string;
  isCapital: boolean;
  isCity: boolean;
  hasHarbor: boolean;
  victoryPoints: number;
}

/**
 * Parse a single INSERT line from map.sql
 * 
 * Field order:
 * 1. internal row id
 * 2. x coordinate
 * 3. y coordinate
 * 4. tribe id
 * 5. village id
 * 6. village name
 * 7. player id
 * 8. player name
 * 9. alliance id
 * 10. alliance tag
 * 11. population
 * 12. region
 * 13. capital flag
 * 14. city flag
 * 15. harbor flag
 * 16. victory points
 */
export function parseMapSqlLine(line: string): ParsedMapRow | null {
  const trimmed = line.trim();
  
  if (!trimmed || !trimmed.startsWith('INSERT INTO')) {
    return null;
  }
  
  // Extract the VALUES (...) part
  const valuesMatch = trimmed.match(/VALUES\s*\((.*)\);?$/);
  if (!valuesMatch) {
    return null;
  }
  
  const valuesString = valuesMatch[1];
  
  // Parse the fields - need to handle SQL-quoted strings with escaped quotes
  const fields: (string | number | boolean)[] = [];
  let current = '';
  let inQuote = false;
  let i = 0;
  
  while (i < valuesString.length) {
    const char = valuesString[i];
    
    if (char === "'") {
      // Check if this is an escaped quote (doubled single quote)
      if (inQuote && i + 1 < valuesString.length && valuesString[i + 1] === "'") {
        // This is an escaped quote inside a string - include both quotes
        current += "''";
        i += 2;
        continue;
      }
      
      // This is a string delimiter
      inQuote = !inQuote;
      current += char;
      i++;
      continue;
    }
    
    if (char === ',' && !inQuote) {
      fields.push(parseField(current.trim()));
      current = '';
      i++;
      continue;
    }
    
    current += char;
    i++;
  }
  
  // Don't forget the last field
  if (current.trim()) {
    fields.push(parseField(current.trim()));
  }
  
  if (fields.length < 16) {
    return null;
  }
  
  return {
    internalId: fields[0] as number,
    x: fields[1] as number,
    y: fields[2] as number,
    tribeId: fields[3] as number,
    villageId: fields[4] as number,
    villageName: fields[5] as string,
    playerId: fields[6] as number,
    playerName: fields[7] as string,
    allianceId: fields[8] as number,
    allianceTag: fields[9] as string,
    population: fields[10] as number,
    region: fields[11] as string,
    isCapital: fields[12] as boolean,
    isCity: fields[13] as boolean,
    hasHarbor: fields[14] as boolean,
    victoryPoints: fields[15] as number,
  };
}

function parseField(field: string): string | number | boolean {
  // Remove surrounding quotes if present and unescape SQL doubled quotes
  if (field.startsWith("'") && field.endsWith("'")) {
    const content = field.slice(1, -1);
    // SQL escapes single quotes by doubling them: '' -> '
    return content.replace(/''/g, "'");
  }
  
  // Boolean
  if (field === 'TRUE') return true;
  if (field === 'FALSE') return false;
  
  // Number (only if it doesn't start with a quote)
  const num = Number(field);
  if (!isNaN(num) && field !== '') {
    return num;
  }
  
  // String (unquoted or empty)
  return field;
}

/**
 * Parse entire map.sql file content
 */
export function parseMapSqlFile(content: string): ParsedMapRow[] {
  const lines = content.split('\n');
  const results: ParsedMapRow[] = [];
  
  for (const line of lines) {
    const parsed = parseMapSqlLine(line);
    if (parsed) {
      results.push(parsed);
    }
  }
  
  return results;
}
