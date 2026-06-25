import json

text = """Nitish Kumar Reddy	6.78	50 LAKHS	BATSMEN
Meg Lanning	8.26	1.5CR	BATSMEN
AB de Villiers 	9.55	2CR	BATSMEN
Mayank Agarwal	7.5	1CR	BATSMEN
Smriti Mandhana 	9.91	2CR	BATSMEN
Rinku Singh	8.33	1.5CR	BATSMEN
Shane Watson	8.52	1.5CR	BATSMEN
Devdutt Padikkal	7.92	1CR	BATSMEN
Shubman Gill 	9.35	2CR	BATSMEN
Shaun Marsh	6.82	50 LAKHS	BATSMEN
Virat Kohli 	9.98	2CR	BATSMEN
Tim David	8.4	1.5CR	BATSMEN
Sai Sudharsan 	9.32	2CR	BATSMEN
Laura Wolvaardt	8.38	1.5CR	BATSMEN
Yashasvi Jaiswal	9.52	2CR	BATSMEN
*Travis Head	8.12	1.5CR	BATSMEN
Suryakumar Yadav 	9.22	2CR	BATSMEN
Gautam Gambhir	8.05	1.5CR	BATSMEN
Faf du Plessis 	8.89	1.5CR	BATSMEN
Rohit Sharma 	9.97	2CR	BATSMEN
Tilak Verma	8.87	1.5CR	BATSMEN
David Warner 	9.88	2CR	BATSMEN
Devon Conway	7.72	1CR	BATSMEN
Matthew Short	6.74	50 LAKHS	BATSMEN
Harmanpreet Kaur	8.08	1.5CR	BATSMEN
Ruturaj Gaikwad	8.55	1.5CR	BATSMEN
Abhishek Sharma	8.67	1.5CR	BATSMEN
Chris Gayle 	9.89	2CR	BATSMEN
Shimron Hetmyer	7.77	1CR	BATSMEN
Manish Pandey	8.75	1.5CR	BATSMEN
Shivam Dube	8.63	1.5CR	BATSMEN
Shafali Verma	7.93	1CR	BATSMEN
Ambati Rayudu	8.55	1.5CR	BATSMEN
Shikhar Dhawan 	9.72	2CR	BATSMEN
Grace Harris	7.52	1CR	BATSMEN
Steve Smith	7.89	1CR	BATSMEN
David Miller	8.78	1.5CR	BATSMEN
Robin Uthappa	8.46	1.5CR	BATSMEN
Daryl Mitchell	7.96	1CR	BATSMEN
Jemimah Rodrigues	7.09	1CR	BATSMEN
Kane Williamson 	9.55	2CR	BATSMEN
Shashank Singh	7.79	1CR	BATSMEN
Riyan Parag	7.31	1CR	BATSMEN
Harleen Deol	6.79	50 LAKHS	BATSMEN
Shreyas Iyer 	9.85	2CR	BATSMEN
Ellyse Perry 	9.47	2CR	BATSMEN
Alex Hales	5.85	30 LAKHS	BATSMEN
Suresh Raina	9.87	2CR	BATSMEN
Sophie Devine	9.51	2CR	ALL ROUNDER
Mitchell Santner	7.85	1CR	ALL ROUNDER
Sunil Narine 	9.81	2CR	ALL ROUNDER
Venkatesh Iyer	8.52	1.5CR	ALL ROUNDER
Washington Sundar	7.62	1CR	ALL ROUNDER
Andre Russel	9.11	2CR	ALL ROUNDER
Pooja Vastrakar	5.95	30 LAKHS	ALL ROUNDER
Glenn Maxwell	8.95	1.5CR	ALL ROUNDER
Mitchell Marsh	8.55	1.5CR	ALL ROUNDER
Sam Curran	7.88	1CR	ALL ROUNDER
Ashleigh Gardner	7.73	1CR	ALL ROUNDER
Ravindra Jadeja 	9.64	2CR	ALL ROUNDER
Will Jacks	8.13	1.5CR	ALL ROUNDER
Axar Patel 	9.32	2CR	ALL ROUNDER
Amelia Kerr	8.96	1.5CR	ALL ROUNDER
Hardik Pandya 	9.78	2CR	ALL ROUNDER
Nat Sciver-Brunt 	9.81	2CR	ALL ROUNDER
Krunal Pandya	8.88	1.5CR	ALL ROUNDER
Liam Livingston	6.92	50 LAKHS	ALL ROUNDER
Cameron Green	7.05	1CR	ALL ROUNDER
Hayley Matthews 	9.74	2CR	ALL ROUNDER
Marcus Stoinis	7.92	1CR	ALL ROUNDER
Kieron Pollard 	9.66	2CR	ALL ROUNDER
Vijay Shankar	7.02	1CR	ALL ROUNDER
Georgia Wareham	6.85	50 LAKHS	ALL ROUNDER
Dwayne Bravo	9.3	2CR	ALL ROUNDER
Deepti Sharma 	9.01	2CR	ALL ROUNDER
Matt Henry	6.56	50 LAKHS	BOWLER
Lauren Bell	8.65	1.5CR	BOWLER
Trent Boult 	9.31	2CR	BOWLER
Prasidh Krishna	8.95	1.5CR	BOWLER
Jofra Archer	7.39	1CR	BOWLER
Moen Ali	7.58	1CR	BOWLER
Varun Chakaravarthy	9.05	2CR	BOWLER
Pat Cummins 	8.48	1.5CR	BOWLER
Mitchell McClenaghan	8.27	1.5CR	BOWLER
Mohammed Shami 	9.75	2CR	BOWLER
Mitchell Starc	8.75	1.5CR	BOWLER
Kate Cross	5.56	30 LAKHS	BOWLER
Imran Tahir	8.34	1.5CR	BOWLER
Tom Curran	4.45	20 LAKHS	BOWLER
*Kagiso Rabada	8.27	1.5CR	BOWLER
Sayali Satghare	4.75	20 LAKHS	BOWLER
Lasith Malinga	9.77	2CR	BOWLER
Umesh Yadav	8.88	1.5CR	BOWLER
Andrew Tye	7.48	1CR	BOWLER
Deepak Chahar	8.08	1.5CR	BOWLER
Ravichandran Ashwin	8.28	1.5CR	BOWLER
Umran Malik	5.95	30 LAKHS	BOWLER
Shreyanka Patil	7.45	1CR	BOWLER
Bhuvneshwar Kumar	9.88	2CR	BOWLER
Noor Ahmad	7.42	1CR	BOWLER
Jayden Seales	4.86	20 LAKHS	BOWLER
Kuldeep Yadav 	9.15	2CR	BOWLER
Anrich Nortje	7.1	1CR	BOWLER
Amit Mishra	7.96	1CR	BOWLER
Rashid Khan	9.47	2CR	BOWLER
Mohit Sharma	7.78	1CR	BOWLER
Ravi Bishnoi	7.85	1CR	BOWLER
Jasprit Bumrah 	9.54	2CR	BOWLER
Khaleel Ahmed	6.95	50 LAKHS	BOWLER
Harshal Patel 	8.32	1.5CR	BOWLER
Yuzvendra Chahal 	9.88	2CR	BOWLER
Piyush Chawla	8.42	1.5CR	BOWLER
Arshdeep Singh	9.72	2CR	BOWLER
Shikha Pandey 	4.27	20 LAKHS	BOWLER
Jos Buttler 	9.57	2CR	WICKETKEEPER
Heinrich Klaasen	7.93	1CR	WICKETKEEPER
Kusal Mendis	5.65	30 LAKHS	WICKETKEEPER
Dinesh Karthik	8.58	1.5CR	WICKETKEEPER
Rishabh Pant 	9.14	2CR	WICKETKEEPER
*Quinton De Cock	8.55	1.5CR	WICKETKEEPER
Prabhsimran Singh	7.45	1CR	WICKETKEEPER
*Nicolas Pooran	8.04	1.5CR	WICKETKEEPER
MS Dhoni 	9.96	2CR	WICKETKEEPER
Jitesh Sharma	8.45	1.5CR	WICKETKEEPER
Richa Ghosh	7.64	1CR	WICKETKEEPER
KL Rahul 	9.58	2CR	WICKETKEEPER
Phil Salt	7.94	1CR	WICKETKEEPER
Alyssa Healy	8.75	1.5CR	WICKETKEEPER
Wriddhiman Saha	7.71	1CR	WICKETKEEPER
Ishan Kishan	8.22	1.5CR	WICKETKEEPER
Sanju Samson 	9.32	2CR	WICKETKEEPER
Kiran Navgire	5.58	30 LAKHS	UNCAPPED BATSMEN
Yash Dhull 	4.65	20 LAKHS	UNCAPPED BATSMEN
Sameer Rizvi 	6.65	50 LAKHS	UNCAPPED BATSMEN
Ashutosh Sharma 	6.58	50 LAKHS	UNCAPPED BATSMEN
Vaibhav Suryavanshi	8.53	1.5CR	UNCAPPED BATSMEN
Priyansh Arya	6.48	50 LAKHS	UNCAPPED BATSMEN
Prashant Veer	5.53	30 LAKHS	UNCAPPED BATSMEN
Angkrish Raghuvanshi 	6.77	50 LAKHS	UNCAPPED BATSMEN
Rahul Tewatia	7.06	1CR	UNCAPPED BATSMEN
R. Sai Kishore	7.52	1CR	UNCAPPED BOWLER
Vipraj Nigam 	5.45	30 LAKHS	UNCAPPED BOWLER
Yash Dayal	7.58	1CR	UNCAPPED BOWLER
Vaibhav Arora	5.75	30 LAKHS	UNCAPPED BOWLER
K.L. Shrijith 	4.94	20 LAKHS	UNCAPPED WICKETKEEPER
Urvil Patel 	6.25	50 LAKHS	UNCAPPED WICKETKEEPER
Kartik Sharma 	5.22	30 LAKHS	UNCAPPED WICKETKEEPER
Harvik Desai 	4.37	20 LAKHS	UNCAPPED WICKETKEEPER
Abishek Porel	6.27	50 LAKHS	UNCAPPED WICKETKEEPER
Anushka Sharma	4.95	20 LAKHS	UNCAPPED ALL ROUNDER"""

cleaned = []
for line in text.split('\\n'):
    if line.strip():
        # Replace * if present like in *Travis Head, but we can do that inside or just leave the text as is.
        clean_line = line.replace('*', '')  # The user had stars on some players, let's remove them to make it correct
        cleaned.append(clean_line)

with open('data/players_new.txt', 'w', encoding='utf-8') as f:
    f.write('\\n'.join(cleaned))
    
print("Saved to data/players_new.txt")
