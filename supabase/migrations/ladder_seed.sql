-- ═══════════════════════════════════════════════════════════════════════════
-- KG Ladder — Schema update + Pre-seed 87 teams from spreadsheet
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Add name columns and make player IDs nullable (most teams aren't app users yet)
ALTER TABLE ladder_teams ADD COLUMN IF NOT EXISTS player1_name TEXT;
ALTER TABLE ladder_teams ADD COLUMN IF NOT EXISTS player2_name TEXT;
ALTER TABLE ladder_teams ALTER COLUMN player1_id DROP NOT NULL;
ALTER TABLE ladder_teams ALTER COLUMN player2_id DROP NOT NULL;

-- Drop the unique constraint on player IDs (pre-seeded teams won't have IDs)
ALTER TABLE ladder_teams DROP CONSTRAINT IF EXISTS ladder_teams_player1_id_player2_id_key;

-- Drop the unique constraint on rank temporarily for bulk insert
ALTER TABLE ladder_teams DROP CONSTRAINT IF EXISTS ladder_teams_rank_key;

-- Step 2: Clear any existing teams (fresh seed)
DELETE FROM ladder_history;
DELETE FROM ladder_challenges;
DELETE FROM ladder_teams;

-- Step 3: Insert all 87 teams
INSERT INTO ladder_teams (rank, player1_name, player2_name, team_name, status) VALUES
(1, 'Basit Shajani', 'Bilal Hayat Khan', 'Basit & Bilal', 'active'),
(2, 'Irfan Latif', 'Abdul Rahim', 'Irfan & Abdul', 'active'),
(3, 'Ibrahim Shiraz', 'Raffay Ahrar', 'Ibrahim & Raffay', 'active'),
(4, 'Haider Shehzad', 'Hamzah Shehzad', 'Haider & Hamzah', 'active'),
(5, 'Saad Garib', 'Farhan Arif', 'Saad & Farhan', 'active'),
(6, 'Zunair Ali', 'Daniyal Kamran', 'Zunair & Daniyal', 'active'),
(7, 'Daniyal Shahid', 'Hamza Khawaja', 'Daniyal & Hamza', 'active'),
(8, 'Khizer Mahboob', 'Shafae Mahboob', 'Khizer & Shafae', 'active'),
(9, 'Ali Godil', 'Wahab Paragon', 'Ali & Wahab', 'active'),
(10, 'Hamza Bawany', 'Bilal Bawany', 'Hamza & Bilal', 'active'),
(11, 'Shazim Kothawala', 'Bilal Shaukat', 'Shazim & Bilal', 'active'),
(12, 'Mohammad Adnan', 'Daniyal Mirza', 'Mohammad & Daniyal', 'active'),
(13, 'Adnan Allahwala', 'Ahsan Naveed', 'Adnan & Ahsan', 'active'),
(14, 'Yasir Eqbal', 'Abdullah Shahid', 'Yasir & Abdullah', 'active'),
(15, 'Farhan Iftikhar', 'Muneeb Ashfaq', 'Farhan & Muneeb', 'active'),
(16, 'Saad Paragon', 'Naufal Javed', 'Saad & Naufal', 'active'),
(17, 'Saad Tariq', 'Saad Ali', 'Saad & Saad', 'active'),
(18, 'Ali Kenan', 'Ahmed Masood', 'Ali & Ahmed', 'active'),
(19, 'Wahaj Naseer', 'Ahrar Ahmed', 'Wahaj & Ahrar', 'active'),
(20, 'Asad Rashid', 'Amaan Zuberi', 'Asad & Amaan', 'active'),
(21, 'Choudhry Zaeem', 'Faraz Meer', 'Zaeem & Faraz', 'active'),
(22, 'Haseeb Iqbal', 'Rais Abir', 'Haseeb & Rais', 'active'),
(23, 'Shamas Ur Rehman', 'Omayr Shaikh', 'Shamas & Omayr', 'active'),
(24, 'Ahsan Amir', 'Ghazain Dada', 'Ahsan & Ghazain', 'active'),
(25, 'Alamgir Feroz', 'Mustafa Mumtaz', 'Alamgir & Mustafa', 'active'),
(26, 'Mustafa Faisal (II)', 'Ahmad Irfan', 'Mustafa & Ahmad', 'active'),
(27, 'Murtaza Mamoowala', 'Yousuf Shafiq', 'Murtaza & Yousuf', 'active'),
(28, 'Muhammad Ali Raza', 'Muhammad Yousuf', 'Ali Raza & Yousuf', 'active'),
(29, 'Faizan Hannan', 'Shiraz Masood', 'Faizan & Shiraz', 'active'),
(30, 'Taufiq Cochinwala', 'Zain Salim', 'Taufiq & Zain', 'active'),
(31, 'Murtaza Saleem', 'Tayyab Balagam', 'Murtaza & Tayyab', 'active'),
(32, 'Mustafa Ajaz', 'Taimur Ajaz', 'Mustafa & Taimur', 'active'),
(33, 'Ammar Salim', 'Faizan Kushtiwala', 'Ammar & Faizan', 'active'),
(34, 'Faisal Gul Ahmed', 'Ali Parekh', 'Faisal & Ali', 'active'),
(35, 'Riaz Salim', 'Mustafa Quettawala', 'Riaz & Mustafa', 'active'),
(36, 'Zayan Sardar', 'Ahmed Saghir', 'Zayan & Ahmed', 'active'),
(37, 'Uzair Vakil', 'Ali Junejo', 'Uzair & Ali', 'active'),
(38, 'Obaid Yaqub', 'Kamil Lotia', 'Obaid & Kamil', 'active'),
(39, 'Kashif Anis', 'Sami Garib', 'Kashif & Sami', 'active'),
(40, 'Yousuf Teli', 'Fawad Basir', 'Yousuf & Fawad', 'active'),
(41, 'Sheheryar Ahmed', 'Habib Khanani', 'Sheheryar & Habib', 'active'),
(42, 'Rohail Habib', 'Kumail Habib', 'Rohail & Kumail', 'active'),
(43, 'Mohammad Waseem', 'Ali Altaf', 'Waseem & Ali', 'active'),
(44, 'Irfan Iqbal', 'Khurram Ashfaq', 'Irfan & Khurram', 'active'),
(45, 'Shayan Abdul Razzaq', 'Kashif Chitalwala', 'Shayan & Kashif', 'active'),
(46, 'Raafay Ali', 'Tabish Ashfaq', 'Raafay & Tabish', 'active'),
(47, 'Abdul Wali Mehta', 'S. Ghassan Ahmed', 'Wali & Ghassan', 'active'),
(48, 'Shehroze Moosa', 'Azeem Adamjee', 'Shehroze & Azeem', 'active'),
(49, 'Adeel Javed', 'Muhammad Zeeshan', 'Adeel & Zeeshan', 'active'),
(50, 'Bilal Tabani', 'Mustafa Nadeem', 'Bilal & Mustafa', 'active'),
(51, 'Dr. Ashar Jamelle', 'Sufyan Bawany', 'Ashar & Sufyan', 'active'),
(52, 'Babar Shaikh', 'Saad Ahmad', 'Babar & Saad', 'active'),
(53, 'Mustafa Faisal', 'Hamzah Sakrani', 'Mustafa & Hamzah', 'active'),
(54, 'Omer Salahuddin', 'Asfandiyar Farrukh', 'Omer & Asfandiyar', 'active'),
(55, 'Zain ul Abideen', 'Hamza Asif', 'Zain & Hamza', 'active'),
(56, 'Zaid Amin', 'Ebrahim Amin', 'Zaid & Ebrahim', 'active'),
(57, 'Ammar Anis', 'Mahad Khan', 'Ammar & Mahad', 'active'),
(58, 'Sarfaraz Paracha', 'Agha Ali Jaan', 'Sarfaraz & Agha', 'active'),
(59, 'Umar Anjum', 'Zain Abbass', 'Umar & Zain', 'active'),
(60, 'Kumail Abbass', 'Mohd. Ebrahim Bashir', 'Kumail & Ebrahim', 'active'),
(61, 'Khalid Wyne', 'Salman Moiz', 'Khalid & Salman', 'active'),
(62, 'Ahmed Noshad', 'Ibrahim Faisal', 'Ahmed & Ibrahim', 'active'),
(63, 'Abdul Moiz Bashir', 'Hunain Bashir', 'Moiz & Hunain', 'active'),
(64, 'Faizan Saleem', 'Zohaib Amir', 'Faizan & Zohaib', 'active'),
(65, 'Hammad Mandavia', 'Abid Salim', 'Hammad & Abid', 'active'),
(66, 'Ahsan Aftab', 'Muneeb Rauf', 'Ahsan & Muneeb', 'active'),
(67, 'Zohair Merchant', 'Abdullah Puri', 'Zohair & Abdullah', 'active'),
(68, 'Saqib Khan', 'Asad Qadri', 'Saqib & Asad', 'active'),
(69, 'Mustafa Kasmani', 'Imran Bhamani', 'Mustafa & Imran', 'active'),
(70, 'Faiz Allawala', 'Raaef Allawala', 'Faiz & Raaef', 'active'),
(71, 'Mustafa Moosa', 'Shayan Rizi', 'Mustafa & Shayan', 'active'),
(72, 'Shehryar Burney', 'Farhan Quettalwala', 'Shehryar & Farhan', 'active'),
(73, 'Mikhail Ali Rizwan', 'Ammar Dagha', 'Mikhail & Ammar', 'active'),
(74, 'Shezad Abdullah', 'Raza Pooya', 'Shezad & Raza', 'active'),
(75, 'Meer Parekh', 'Pankaj', 'Meer & Pankaj', 'active'),
(76, 'Mohd. Bashir', 'Mustafa Sajid', 'Bashir & Mustafa', 'active'),
(77, 'Imran Mehmood', 'Muneer Feroz', 'Imran & Muneer', 'active'),
(78, 'Danish Naseem', 'Abdur Rafay', 'Danish & Rafay', 'active'),
(79, 'Sultan Waqar', 'Salik Sajid', 'Sultan & Salik', 'active'),
(80, 'Talha Batla', 'Adil Mushtaq', 'Talha & Adil', 'active'),
(81, 'Rizwan Feroz', 'Zubair Iqbal', 'Rizwan & Zubair', 'active'),
(82, 'Shayan Rashid', 'Hadi Anis', 'Shayan & Hadi', 'active'),
(83, 'Ibrahim Faisal', 'Aneeq Nadeem', 'Ibrahim & Aneeq', 'active'),
(84, 'Rayyan Pervez', 'Yahya Essa', 'Rayyan & Yahya', 'active'),
(85, 'Tabish Zahid', 'Ayman Zahid', 'Tabish & Ayman', 'active'),
(86, 'Adil Amjad', 'Raza Khalid', 'Adil & Raza', 'active');

-- Re-add unique constraint on rank
ALTER TABLE ladder_teams ADD CONSTRAINT ladder_teams_rank_key UNIQUE (rank);
