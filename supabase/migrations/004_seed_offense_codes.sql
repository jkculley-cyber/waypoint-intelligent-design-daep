-- ============================================
-- Texas Education Code Offense Codes
-- System-wide defaults (district_id = NULL)
-- Districts can add their own codes
-- ============================================

-- Fighting / Assault
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, is_discretionary_daep, peims_action_code) VALUES
(NULL, 'FIGHT-01', 'fighting', 'Fighting - No Injury', 'Mutual combat between students with no serious bodily injury', 'TEC 37.001(a)(2)', 'moderate', true, '21'),
(NULL, 'FIGHT-02', 'fighting', 'Fighting - With Injury', 'Fighting resulting in bodily injury', 'TEC 37.006(a)(2)(A)', 'serious', true, '22'),
(NULL, 'ASSAULT-01', 'fighting', 'Assault on Student', 'Intentionally, knowingly, or recklessly causing bodily injury to another student', 'TEC 37.006(a)(2)(A)', 'serious', true, '23'),
(NULL, 'ASSAULT-02', 'fighting', 'Assault on School Employee', 'Assault against a school district employee or volunteer', 'TEC 37.006(a)(2)(B)', 'severe', false, '24'),
(NULL, 'AGG-ASSAULT', 'fighting', 'Aggravated Assault', 'Assault causing serious bodily injury or using/exhibiting a deadly weapon', 'TEC 37.007(a)(2)(A)', 'severe', false, '25');

-- Drugs / Alcohol
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, is_mandatory_daep, is_discretionary_daep, peims_action_code) VALUES
(NULL, 'DRUG-01', 'drugs_alcohol', 'Drug Possession', 'Possession of a controlled substance under Penalty Group 1-4', 'TEC 37.006(a)(1)', 'severe', true, false, '31'),
(NULL, 'DRUG-02', 'drugs_alcohol', 'Drug Distribution/Sale', 'Delivering, selling, or distributing a controlled substance', 'TEC 37.006(a)(1)', 'severe', true, false, '32'),
(NULL, 'DRUG-03', 'drugs_alcohol', 'Marijuana Possession', 'Possession of marijuana', 'TEC 37.006(a)(1)', 'serious', true, false, '33'),
(NULL, 'ALC-01', 'drugs_alcohol', 'Alcohol Possession/Use', 'Possession, use, or being under the influence of alcohol', 'TEC 37.006(a)(1)', 'serious', true, false, '34'),
(NULL, 'DRUG-04', 'drugs_alcohol', 'Prescription Drug Misuse', 'Possession or distribution of prescription medication', 'TEC 37.006(a)(1)', 'serious', false, true, '35'),
(NULL, 'VAPE-01', 'drugs_alcohol', 'Vaping/E-Cigarette (Nicotine)', 'Possession or use of e-cigarette or vaping device with nicotine', 'TEC 37.001', 'moderate', false, true, '36'),
(NULL, 'VAPE-02', 'drugs_alcohol', 'Vaping/E-Cigarette (THC)', 'Possession or use of e-cigarette or vaping device with THC', 'TEC 37.006(a)(1)', 'severe', true, false, '37');

-- Weapons
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, is_mandatory_daep, is_mandatory_expulsion, peims_action_code) VALUES
(NULL, 'WEAPON-01', 'weapons', 'Firearm Possession', 'Bringing a firearm to school', 'TEC 37.007(a)(1)', 'severe', false, true, '41'),
(NULL, 'WEAPON-02', 'weapons', 'Illegal Knife Possession', 'Possession of an illegal knife on school property', 'TEC 37.007(a)(1)', 'severe', false, true, '42'),
(NULL, 'WEAPON-03', 'weapons', 'Club/Prohibited Weapon', 'Possession of a club or prohibited weapon', 'TEC 37.007(a)(1)', 'severe', false, true, '43'),
(NULL, 'WEAPON-04', 'weapons', 'Look-Alike/Replica Weapon', 'Possession of a look-alike weapon or replica', 'TEC 37.001', 'moderate', false, false, '44');

-- Harassment / Bullying
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, is_discretionary_daep, peims_action_code) VALUES
(NULL, 'BULLY-01', 'harassment_bullying', 'Bullying', 'Engaging in written, verbal, or physical conduct that constitutes bullying', 'TEC 37.0832', 'moderate', true, '51'),
(NULL, 'BULLY-02', 'harassment_bullying', 'Cyberbullying', 'Bullying conducted through electronic communication', 'TEC 37.0832', 'moderate', true, '52'),
(NULL, 'HARASS-01', 'harassment_bullying', 'Harassment - Verbal/Written', 'Threatening or intimidating conduct directed at another student', 'TEC 37.001(a)(4)', 'moderate', true, '53'),
(NULL, 'HARASS-02', 'harassment_bullying', 'Sexual Harassment', 'Unwelcome sexual advances, requests, or conduct', 'TEC 37.006(b)', 'serious', true, '54'),
(NULL, 'HARASS-03', 'harassment_bullying', 'Harassment Based on Protected Class', 'Harassment based on race, color, religion, sex, national origin, disability', 'TEC 37.001', 'serious', true, '55');

-- Truancy / Attendance
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, peims_action_code) VALUES
(NULL, 'TRUAN-01', 'truancy', 'Excessive Unexcused Absences', '10+ unexcused absences in 6-month period', 'TEC 25.0951', 'minor', '61'),
(NULL, 'TRUAN-02', 'truancy', 'Class Cutting/Skipping', 'Leaving assigned class or area without permission', 'TEC 37.001', 'minor', '62'),
(NULL, 'TRUAN-03', 'truancy', 'Leaving Campus Without Permission', 'Departing school grounds during school hours without authorization', 'TEC 37.001', 'moderate', '63');

-- Defiance / Insubordination
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, peims_action_code) VALUES
(NULL, 'DEFY-01', 'defiance', 'Insubordination', 'Refusal to comply with reasonable directive from school personnel', 'TEC 37.001(a)(1)', 'minor', '71'),
(NULL, 'DEFY-02', 'defiance', 'Disruptive Behavior', 'Conduct that substantially disrupts school operations', 'TEC 37.001(a)(1)', 'minor', '72'),
(NULL, 'DEFY-03', 'defiance', 'Profanity/Obscene Gesture Toward Staff', 'Using profanity or vulgar language directed at school personnel', 'TEC 37.001(a)(2)', 'moderate', '73'),
(NULL, 'DEFY-04', 'defiance', 'False Alarm/Threat', 'Making a false alarm or terroristic threat', 'TEC 37.007(a)(3)', 'severe', '74');

-- Theft
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, peims_action_code) VALUES
(NULL, 'THEFT-01', 'theft', 'Theft - Minor', 'Taking property valued under $100 without consent', 'TEC 37.001', 'minor', '81'),
(NULL, 'THEFT-02', 'theft', 'Theft - Major', 'Taking property valued $100+ without consent', 'TEC 37.001', 'moderate', '82'),
(NULL, 'ROB-01', 'theft', 'Robbery', 'Taking property from another by force or threat', 'TEC 37.006(a)(2)(D)', 'severe', '83');

-- Vandalism
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, peims_action_code) VALUES
(NULL, 'VAND-01', 'vandalism', 'Vandalism - Minor', 'Intentional damage to school or personal property under $500', 'TEC 37.001', 'minor', '91'),
(NULL, 'VAND-02', 'vandalism', 'Vandalism - Major', 'Intentional damage to school or personal property $500+', 'TEC 37.001', 'moderate', '92'),
(NULL, 'ARSON-01', 'vandalism', 'Arson', 'Intentionally starting a fire on school property', 'TEC 37.007(a)(2)(C)', 'severe', '93');

-- Sexual Offenses
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, is_mandatory_daep, peims_action_code) VALUES
(NULL, 'SEX-01', 'sexual_offense', 'Indecent Exposure', 'Exposure of private body parts in a public setting', 'TEC 37.006', 'serious', true, 'A1'),
(NULL, 'SEX-02', 'sexual_offense', 'Sexual Assault', 'Sexual contact without consent', 'TEC 37.007(a)(2)(A)', 'severe', false, 'A2');

-- Gang-Related
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, is_discretionary_daep, peims_action_code) VALUES
(NULL, 'GANG-01', 'gang_related', 'Gang-Related Activity', 'Engaging in gang-related activity on campus', 'TEC 37.001', 'serious', true, 'B1'),
(NULL, 'GANG-02', 'gang_related', 'Gang Recruitment/Intimidation', 'Recruiting or intimidating others for gang involvement', 'TEC 37.001', 'serious', true, 'B2');

-- Other
INSERT INTO offense_codes (district_id, code, category, title, description, tec_reference, severity, peims_action_code) VALUES
(NULL, 'OTHER-01', 'other', 'Other Code of Conduct Violation', 'Violation of student code of conduct not covered by specific category', 'TEC 37.001', 'minor', 'C1'),
(NULL, 'TECH-01', 'other', 'Technology Misuse', 'Violation of acceptable use policy for technology', 'TEC 37.001', 'minor', 'C2'),
(NULL, 'THREAT-01', 'other', 'Terroristic Threat', 'Making a threat to cause violence or harm', 'TEC 37.007(a)(3)', 'severe', 'C3');
