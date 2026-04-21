import { describe, it, expect } from 'vitest';
import { parseMapSqlLine, parseMapSqlFile } from '../../src/travian/mapSqlParser.js';

describe('mapSqlParser', () => {
  describe('parseMapSqlLine', () => {
    it('should parse a basic village line with alliance', () => {
      // Real sample from ROF map.sql
      const line = "INSERT INTO `x_world` VALUES (1000,-3,198,3,31334,'SSj00',3363,'CrT',179,'SWR',102,'Cimbri',FALSE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result).toEqual({
        internalId: 1000,
        x: -3,
        y: 198,
        tribeId: 3,
        villageId: 31334,
        villageName: 'SSj00',
        playerId: 3363,
        playerName: 'CrT',
        allianceId: 179,
        allianceTag: 'SWR',
        population: 102,
        region: 'Cimbri',
        isCapital: false,
        isCity: false,
        hasHarbor: false,
        victoryPoints: 0,
      });
    });

    it('should parse Natars village (tribe 5)', () => {
      const line = "INSERT INTO `x_world` VALUES (1,-200,200,5,1,'Natars',1,'Natars',0,'',8,'Caledonia',TRUE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result).toEqual({
        internalId: 1,
        x: -200,
        y: 200,
        tribeId: 5,
        villageId: 1,
        villageName: 'Natars',
        playerId: 1,
        playerName: 'Natars',
        allianceId: 0,
        allianceTag: '',
        population: 8,
        region: 'Caledonia',
        isCapital: true,
        isCity: false,
        hasHarbor: false,
        victoryPoints: 0,
      });
    });

    it('should parse village without alliance', () => {
      const line = "INSERT INTO `x_world` VALUES (1002,-1,198,6,31959,'Làng mới',4614,'kaka',0,'',40,'Cimbri',FALSE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result).toEqual({
        internalId: 1002,
        x: -1,
        y: 198,
        tribeId: 6,
        villageId: 31959,
        villageName: 'Làng mới',
        playerId: 4614,
        playerName: 'kaka',
        allianceId: 0,
        allianceTag: '',
        population: 40,
        region: 'Cimbri',
        isCapital: false,
        isCity: false,
        hasHarbor: false,
        victoryPoints: 0,
      });
    });

    it('should parse village with harbor', () => {
      const line = "INSERT INTO `x_world` VALUES (5002,-11,188,7,28756,'02. Solaroc',321,'Raikou',5,'WP',247,'Cimbri',FALSE,FALSE,TRUE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result).toEqual({
        internalId: 5002,
        x: -11,
        y: 188,
        tribeId: 7,
        villageId: 28756,
        villageName: '02. Solaroc',
        playerId: 321,
        playerName: 'Raikou',
        allianceId: 5,
        allianceTag: 'WP',
        population: 247,
        region: 'Cimbri',
        isCapital: false,
        isCity: false,
        hasHarbor: true,
        victoryPoints: 0,
      });
    });

    it('should parse capital village', () => {
      const line = "INSERT INTO `x_world` VALUES (1786,-19,196,1,28811,'2. Hélionceau',291,'Magikarp',5,'WP',276,'Cimbri',TRUE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result).toEqual({
        internalId: 1786,
        x: -19,
        y: 196,
        tribeId: 1,
        villageId: 28811,
        villageName: '2. Hélionceau',
        playerId: 291,
        playerName: 'Magikarp',
        allianceId: 5,
        allianceTag: 'WP',
        population: 276,
        region: 'Cimbri',
        isCapital: true,
        isCity: false,
        hasHarbor: false,
        victoryPoints: 0,
      });
    });

    it('should parse village with capital and harbor flags', () => {
      const line = "INSERT INTO `x_world` VALUES (6746,129,184,6,30018,'00 Lightsize',1608,'Lightsize',67,'CAOS',99,'Hyperborea',TRUE,FALSE,TRUE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result).toEqual({
        internalId: 6746,
        x: 129,
        y: 184,
        tribeId: 6,
        villageId: 30018,
        villageName: '00 Lightsize',
        playerId: 1608,
        playerName: 'Lightsize',
        allianceId: 67,
        allianceTag: 'CAOS',
        population: 99,
        region: 'Hyperborea',
        isCapital: true,
        isCity: false,
        hasHarbor: true,
        victoryPoints: 0,
      });
    });

    it('should handle village names with special characters and quotes', () => {
      const line = "INSERT INTO `x_world` VALUES (6811,194,184,3,30449,'¥《DefensivePoisoN》¥',1814,'ScorpionLeH',87,'WP2',157,'Hyperborea',FALSE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result?.villageName).toBe('¥《DefensivePoisoN》¥');
      expect(result?.playerName).toBe('ScorpionLeH');
    });

    it('should handle Unicode village and player names', () => {
      const line = "INSERT INTO `x_world` VALUES (3986,176,191,1,31910,'璇璣百變的六芒',5311,'hin',0,'',65,'Hyperborea',FALSE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result?.villageName).toBe('璇璣百變的六芒');
      expect(result?.playerName).toBe('hin');
    });

    it('should handle Cyrillic characters', () => {
      const line = "INSERT INTO `x_world` VALUES (4370,159,190,3,30037,'Нововоронеж',3114,'Белояр',137,'RUS',213,'Hyperborea',TRUE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result?.villageName).toBe('Нововоронеж');
      expect(result?.playerName).toBe('Белояр');
      expect(result?.allianceTag).toBe('RUS');
    });

    it('should handle SQL-escaped single quotes in village names', () => {
      // SQL escapes single quotes by doubling them: 'O''Brien' -> O'Brien
      const line = "INSERT INTO `x_world` VALUES (5000,10,100,1,12345,'O''Brien''s Village',500,'Patrick',0,'',150,'Region',FALSE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result?.villageName).toBe("O'Brien's Village");
      expect(result?.playerName).toBe('Patrick');
    });

    it('should handle SQL-escaped single quotes in player names', () => {
      const line = "INSERT INTO `x_world` VALUES (5001,11,101,3,12346,'New Town',501,'O''Reilly',15,'D''NA',200,'Region',TRUE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result?.villageName).toBe('New Town');
      expect(result?.playerName).toBe("O'Reilly");
      expect(result?.allianceTag).toBe("D'NA");
    });

    it('should handle multiple escaped quotes in a single field', () => {
      const line = "INSERT INTO `x_world` VALUES (5002,12,102,6,12347,'It''s ''The'' Best',502,'Player',0,'',175,'Region',FALSE,FALSE,FALSE,0);";
      
      const result = parseMapSqlLine(line);
      
      expect(result?.villageName).toBe("It's 'The' Best");
    });

    it('should return null for non-INSERT lines', () => {
      const result = parseMapSqlLine('CREATE TABLE x_world ...');
      expect(result).toBeNull();
    });

    it('should return null for empty lines', () => {
      const result = parseMapSqlLine('');
      expect(result).toBeNull();
    });
  });

  describe('parseMapSqlFile', () => {
    it('should parse multiple lines and return array of records', () => {
      const content = `INSERT INTO \`x_world\` VALUES (1000,-3,198,3,31334,'SSj00',3363,'CrT',179,'SWR',102,'Cimbri',FALSE,FALSE,FALSE,0);
INSERT INTO \`x_world\` VALUES (1002,-1,198,6,31959,'Làng mới',4614,'kaka',0,'',40,'Cimbri',FALSE,FALSE,FALSE,0);
INSERT INTO \`x_world\` VALUES (1786,-19,196,1,28811,'2. Hélionceau',291,'Magikarp',5,'WP',276,'Cimbri',TRUE,FALSE,FALSE,0);`;
      
      const result = parseMapSqlFile(content);
      
      expect(result).toHaveLength(3);
      expect(result[0].villageId).toBe(31334);
      expect(result[1].villageId).toBe(31959);
      expect(result[2].villageId).toBe(28811);
    });

    it('should skip empty lines and non-INSERT lines', () => {
      const content = `
CREATE TABLE x_world (...);

INSERT INTO \`x_world\` VALUES (1000,-3,198,3,31334,'SSj00',3363,'CrT',179,'SWR',102,'Cimbri',FALSE,FALSE,FALSE,0);

-- comment
INSERT INTO \`x_world\` VALUES (1002,-1,198,6,31959,'Làng mới',4614,'kaka',0,'',40,'Cimbri',FALSE,FALSE,FALSE,0);
`;
      
      const result = parseMapSqlFile(content);
      
      expect(result).toHaveLength(2);
      expect(result[0].villageId).toBe(31334);
      expect(result[1].villageId).toBe(31959);
    });

    it('should handle empty content', () => {
      const result = parseMapSqlFile('');
      expect(result).toEqual([]);
    });
  });
});
