// ---------- The four stages of MilMATHS ----------
//
// Four stages, ten lessons each, four to ten questions a lesson, and a book
// sitting in front of lessons 1, 4, 7 and 10. Every lesson names the part of
// the Australian Curriculum (v9.0) it comes from, so a grown-up can see where
// it fits and so the stages climb in the order school climbs in them.
//
// A question is one of two shapes:
//
//   { q:'7 × 8', a:56 }                      type the number in
//   { q:'Which is bigger?', pick:[…], a:0 }  tap one of the answers
//
// and may carry extras:
//
//   unit:'cm'   shown after the answer box, and in the marking
//   money:true  answers are dollars: 4.7 and 4.70 are both right
//   hint:'…'    what the Hint feature says (buy it in the shop)
//   why:'…'     the sentence shown after you answer, right or wrong
//   big:true    a short sum, so show it large
//
// Nothing in here knows about XP, locking or the timer. It is just the maths.

export const STAGES = [

// ══════════════════════════════════════════════════════════ STAGE 1 ══════
{
  id: 1,
  name: 'Numbers and Place Value',
  short: 'Numbers',
  year: 'Year 3 · Number',
  icon: '🔢',
  colour: '#3fae4a',
  tint: '#e3f6e4',
  blurb: 'Where every digit sits, and adding and taking away without a calculator.',

  lessons: [
    { n:1, name:'Counting and Ordering to 1000', ac:'AC9M3N01', teach:'Counting on, counting back, and which number is bigger.', qs:[
      { q:'What number comes after 499?', a:500, why:'499 + 1 = 500. The ones and tens both roll over to zero.' },
      { q:'What number comes before 700?', a:699, why:'Counting back from 700 you drop to 699 — six hundreds, nine tens, nine ones.' },
      { q:'Count on by ones: 297, 298, 299, ?', a:300, why:'299 + 1 = 300.' },
      { q:'Which number is biggest?', pick:['608','680','686'], a:2, why:'All three have 6 hundreds. 686 has 8 tens and 6 ones, which beats 680 and 608.' },
      { q:'Smallest first — which one comes FIRST?', pick:['450','405','540'], a:1, why:'405 has only 0 tens, so it is the smallest of the three.' },
      { q:'What number comes after 999?', a:1000, why:'Every column is full, so they all roll over and a new thousands column opens: 1000.' },
    ]},
    { n:2, name:'Hundreds, Tens and Ones', ac:'AC9M3N01', teach:'What each digit in a number is actually worth.', qs:[
      { q:'In 472, what is the 4 worth?', pick:['4','40','400'], a:2, hint:'Which column is the 4 sitting in?', why:'It sits in the hundreds column, so it is worth 400.' },
      { q:'In 836, what is the 3 worth?', pick:['3','30','300'], a:1, why:'The 3 is in the tens column: 3 tens = 30.' },
      { q:'How many tens altogether in 250?', a:25, hint:'250 = 25 lots of ten.', why:'250 ÷ 10 = 25. Twenty-five tens make 250.' },
      { q:'600 + 40 + 7', a:647, big:true, why:'6 hundreds, 4 tens and 7 ones squash together into 647.' },
      { q:'Write the number: 3 hundreds, 0 tens, 9 ones', a:309, why:'The 0 holds the tens column open, so it is 309 and not 39.' },
      { q:'In 5318, what is the 5 worth?', pick:['5','500','5000'], a:2, why:'The 5 is in the thousands column: 5 thousands = 5000.' },
      { q:'900 + 80 + 5', a:985, big:true, why:'Nine hundreds, eight tens and five ones: 985.' },
    ]},
    { n:3, name:'Adding to 100', ac:'AC9M3N03', teach:'Adding two-digit numbers, with and without carrying.', qs:[
      { q:'34 + 25', a:59, big:true, why:'4 + 5 = 9 ones, 3 + 2 = 5 tens. Nothing to carry: 59.' },
      { q:'47 + 38', a:85, big:true, hint:'The ones make 15 — that is 1 ten and 5 ones.', why:'7 + 8 = 15, so write 5 and carry 1. 4 + 3 + 1 = 8 tens. Answer 85.' },
      { q:'60 + 19', a:79, big:true, why:'60 + 19 = 79. The tens go 6 + 1, the ones stay at 9.' },
      { q:'56 + 27', a:83, big:true, why:'6 + 7 = 13, write 3 carry 1. 5 + 2 + 1 = 8. Answer 83.' },
      { q:'48 + ? = 60', a:12, why:'48 needs 2 to reach 50, then 10 more to reach 60. That is 12.' },
      { q:'Greta has 29 stickers and gets 16 more. How many now?', a:45, why:'29 + 16 = 45. Jumping from 29 to 30 uses 1 of the 16, then 30 + 15 = 45.' },
      { q:'75 + 25', a:100, big:true, why:'75 + 25 = 100. Quarters of a hundred are worth learning by heart.' },
    ]},
    { n:4, name:'Subtracting to 100', ac:'AC9M3N03', teach:'Taking away two-digit numbers, including borrowing.', qs:[
      { q:'58 − 23', a:35, big:true, why:'8 − 3 = 5 ones, 5 − 2 = 3 tens. Answer 35.' },
      { q:'71 − 46', a:25, big:true, hint:'You cannot do 1 − 6, so borrow a ten.', why:'Borrow: 11 − 6 = 5, then 6 − 4 = 2. Answer 25.' },
      { q:'90 − 37', a:53, big:true, why:'Borrow a ten: 10 − 7 = 3, then 8 − 3 = 5. Answer 53.' },
      { q:'83 − ? = 60', a:23, why:'83 − 60 = 23, so 23 is the number taken away.' },
      { q:'A milbil had 52 marbles and lost 18. How many are left?', a:34, why:'52 − 18 = 34. Take 2 to get to 50, then 16 more: 34.' },
      { q:'100 − 64', a:36, big:true, why:'64 and 36 add to 100, so 100 − 64 = 36.' },
      { q:'45 − 45', a:0, big:true, why:'Take a number away from itself and nothing is left: 0.' },
    ]},
    { n:5, name:'Bigger Adding and Subtracting', ac:'AC9M3N04', teach:'Three-digit sums, column by column.', qs:[
      { q:'234 + 152', a:386, big:true, why:'4 + 2 = 6, 3 + 5 = 8, 2 + 1 = 3. Answer 386.' },
      { q:'367 + 128', a:495, big:true, why:'7 + 8 = 15, write 5 carry 1. 6 + 2 + 1 = 9. 3 + 1 = 4. Answer 495.' },
      { q:'486 − 253', a:233, big:true, why:'6 − 3 = 3, 8 − 5 = 3, 4 − 2 = 2. Answer 233.' },
      { q:'500 − 176', a:324, big:true, hint:'Try 500 − 176 as 499 − 176, then add the 1 back.', why:'499 − 176 = 323, add back the 1 you borrowed: 324.' },
      { q:'625 + 275', a:900, big:true, why:'5 + 5 = 10, 2 + 7 + 1 = 10, 6 + 2 + 1 = 9. Answer 900.' },
      { q:'742 − 398', a:344, big:true, hint:'398 is almost 400. Take 400, then give 2 back.', why:'742 − 400 = 342, then + 2 = 344.' },
      { q:'A school has 418 pupils. 126 are away. How many are at school?', a:292, why:'418 − 126 = 292.' },
      { q:'199 + 199', a:398, big:true, why:'200 + 200 = 400, then take back the two 1s you added: 398.' },
    ]},
    { n:6, name:'Number Patterns', ac:'AC9M3A01', teach:'Skip counting forwards and backwards.', qs:[
      { q:'Count by 2s: 12, 14, 16, ?', a:18, why:'Each step adds 2, so 16 + 2 = 18.' },
      { q:'Count by 5s: 35, 40, 45, ?', a:50, why:'45 + 5 = 50. Counting by 5s always ends in 0 or 5.' },
      { q:'Count by 10s: 170, 180, 190, ?', a:200, why:'190 + 10 = 200 — the hundreds column ticks over.' },
      { q:'Count by 3s: 12, 15, 18, ?', a:21, why:'18 + 3 = 21.' },
      { q:'Count BACK by 4s: 40, 36, 32, ?', a:28, why:'Each step takes 4 away: 32 − 4 = 28.' },
      { q:'Count by 25s: 25, 50, 75, ?', a:100, why:'Four 25s make 100 — the same as four 25c coins making a dollar.' },
    ]},
    { n:7, name:'Rounding', ac:'AC9M3N06', teach:'Rounding to the nearest ten and the nearest hundred.', qs:[
      { q:'Round 47 to the nearest 10', a:50, hint:'Is 47 nearer 40 or 50?', why:'47 is only 3 away from 50 but 7 away from 40, so it rounds up to 50.' },
      { q:'Round 62 to the nearest 10', a:60, why:'The ones digit is 2, which is small, so round down to 60.' },
      { q:'Round 85 to the nearest 10', a:90, why:'85 is exactly halfway, and a half always rounds up: 90.' },
      { q:'Round 238 to the nearest 100', a:200, hint:'Look at the tens digit.', why:'The tens digit is 3, so round down to 200.' },
      { q:'Round 371 to the nearest 100', a:400, why:'The tens digit is 7, so round up to 400.' },
      { q:'Round 650 to the nearest 100', a:700, why:'650 is halfway between 600 and 700, and halves round up: 700.' },
    ]},
    { n:8, name:'Australian Money', ac:'AC9M3N05', teach:'Coins, notes, change and dollars written with a dot.', qs:[
      { q:'How many 50c coins make $2?', a:4, why:'Two 50c coins make $1, so four make $2.' },
      { q:'How many 20c coins make $1?', a:5, why:'5 × 20c = 100c = $1.' },
      { q:'$3.50 + $1.20 = ?', a:4.7, money:true, why:'$3.50 + $1.20 = $4.70. Add the dollars, then the cents.' },
      { q:'You pay $10 for a $6.40 book. How much change?', a:3.6, money:true, hint:'Count up from $6.40 to $10.', why:'$6.40 + 60c = $7, + $3 = $10. The change is $3.60.' },
      { q:'Which is the biggest Australian note?', pick:['$50','$100','$20'], a:1, why:'The $100 note is the biggest — it is the green one.' },
      { q:'How many 10c coins make $1.50?', a:15, why:'$1.50 is 150 cents, and 150 ÷ 10 = 15.' },
      { q:'Two drinks cost $2.75 each. How much for both?', a:5.5, money:true, why:'$2.75 + $2.75 = $5.50.' },
    ]},
    { n:9, name:'Odd, Even, Doubles and Halves', ac:'AC9M3N01', teach:'Numbers that split in two, and numbers that do not.', qs:[
      { q:'Is 36 odd or even?', pick:['Odd','Even'], a:1, why:'36 ends in 6, so it is even — it splits into two equal halves of 18.' },
      { q:'Is 471 odd or even?', pick:['Odd','Even'], a:0, why:'It ends in 1. Only the last digit matters, so 471 is odd.' },
      { q:'Double 17', a:34, big:true, why:'17 + 17 = 34.' },
      { q:'Half of 48', a:24, big:true, why:'48 splits into 24 and 24.' },
      { q:'Double 45', a:90, big:true, why:'45 + 45 = 90.' },
      { q:'Half of 130', a:65, big:true, why:'Half of 130 is 65, because 65 + 65 = 130.' },
    ]},
    { n:10, name:'Stage 1 Check-up', ac:'Stage 1 review', checkup:true, teach:'Ten questions from everything in Stage 1.', qs:[
      { q:'In 905, what is the 9 worth?', pick:['9','90','900'], a:2, why:'Hundreds column: 900.' },
      { q:'268 + 137', a:405, big:true, why:'8 + 7 = 15 (carry 1), 6 + 3 + 1 = 10 (carry 1), 2 + 1 + 1 = 4. Answer 405.' },
      { q:'700 − 255', a:445, big:true, why:'700 − 255 = 445. Check: 445 + 255 = 700.' },
      { q:'Round 149 to the nearest 100', a:100, why:'The tens digit is 4, so it rounds down to 100.' },
      { q:'Count by 5s: 80, 85, 90, ?', a:95, why:'90 + 5 = 95.' },
      { q:'Double 36', a:72, big:true, why:'36 + 36 = 72.' },
      { q:'Half of 94', a:47, big:true, why:'47 + 47 = 94.' },
      { q:'How many 20c coins make $2?', a:10, why:'$2 is 200 cents, and 200 ÷ 20 = 10.' },
      { q:'Which is smallest?', pick:['307','370','730'], a:0, why:'307 has 3 hundreds and no tens, so it is the smallest.' },
      { q:'400 + 60 + 2', a:462, big:true, why:'Four hundreds, six tens, two ones: 462.' },
    ]},
  ],
},

// ══════════════════════════════════════════════════════════ STAGE 2 ══════
{
  id: 2,
  name: 'Times, Shares and Fractions',
  short: 'Times tables',
  year: 'Year 4 · Number',
  icon: '✖️',
  colour: '#2f80ed',
  tint: '#e4efff',
  blurb: 'Times tables, dividing things up fairly, and what a fraction really means.',

  lessons: [
    { n:1, name:'The 2, 5 and 10 Times Tables', ac:'AC9M4N06', teach:'The three easiest tables, learned by heart.', qs:[
      { q:'6 × 2', a:12, big:true, why:'Six lots of two, or double six: 12.' },
      { q:'9 × 5', a:45, big:true, why:'Nine fives. Half of 9 × 10 = 90, so 45.' },
      { q:'7 × 10', a:70, big:true, why:'Multiplying by 10 adds a zero: 70.' },
      { q:'12 × 5', a:60, big:true, why:'Half of 12 × 10 = 120, so 60.' },
      { q:'8 × 2', a:16, big:true, why:'Double 8 is 16.' },
      { q:'11 × 10', a:110, big:true, why:'11 with a zero on the end: 110.' },
      { q:'5 bags with 2 apples in each. How many apples?', a:10, why:'5 × 2 = 10.' },
    ]},
    { n:2, name:'The 3, 4 and 6 Times Tables', ac:'AC9M4N06', teach:'The middle tables, and doubling tricks.', qs:[
      { q:'7 × 3', a:21, big:true, why:'Three sevens: 7 + 7 + 7 = 21.' },
      { q:'6 × 4', a:24, big:true, hint:'Double 6, then double again.', why:'6 → 12 → 24.' },
      { q:'8 × 6', a:48, big:true, why:'8 × 6 = 48. It is double 8 × 3 = 24.' },
      { q:'9 × 3', a:27, big:true, why:'Nine threes: 27.' },
      { q:'7 × 4', a:28, big:true, why:'Double 7 is 14, double again is 28.' },
      { q:'6 × 6', a:36, big:true, why:'Six sixes: 36. A square number.' },
      { q:'4 milbils each have 6 pencils. How many pencils?', a:24, why:'4 × 6 = 24.' },
    ]},
    { n:3, name:'The 7, 8 and 9 Times Tables', ac:'AC9M4N06', teach:'The hard ones. Nobody finds these easy at first.', qs:[
      { q:'7 × 7', a:49, big:true, why:'Seven sevens: 49.' },
      { q:'8 × 8', a:64, big:true, why:'Eight eights: 64.' },
      { q:'9 × 9', a:81, big:true, hint:'Ten nines is 90. Take one nine off.', why:'90 − 9 = 81.' },
      { q:'7 × 8', a:56, big:true, why:'7 × 8 = 56. (5, 6, 7, 8 — it even comes in order.)' },
      { q:'6 × 9', a:54, big:true, hint:'Ten sixes, take one six off.', why:'60 − 6 = 54.' },
      { q:'9 × 8', a:72, big:true, why:'80 − 8 = 72.' },
      { q:'7 × 9', a:63, big:true, why:'70 − 7 = 63.' },
      { q:'12 × 8', a:96, big:true, why:'10 × 8 = 80 and 2 × 8 = 16. Together, 96.' },
    ]},
    { n:4, name:'Dividing', ac:'AC9M4N06', teach:'Sharing equally — the times tables run backwards.', qs:[
      { q:'24 ÷ 4', a:6, big:true, why:'6 × 4 = 24, so 24 ÷ 4 = 6.' },
      { q:'35 ÷ 5', a:7, big:true, why:'7 × 5 = 35.' },
      { q:'48 ÷ 6', a:8, big:true, why:'8 × 6 = 48.' },
      { q:'63 ÷ 9', a:7, big:true, why:'7 × 9 = 63.' },
      { q:'Share 36 lollies between 4 milbils. How many each?', a:9, why:'36 ÷ 4 = 9, because 9 × 4 = 36.' },
      { q:'72 ÷ 8', a:9, big:true, why:'9 × 8 = 72.' },
      { q:'100 ÷ 10', a:10, big:true, why:'Ten tens make 100.' },
    ]},
    { n:5, name:'Remainders', ac:'AC9M4N07', teach:'What is left over when it will not share evenly.', qs:[
      { q:'13 ÷ 4 — what is the remainder?', a:1, hint:'The biggest 4 that fits in 13 is 12.', why:'3 × 4 = 12, and 13 − 12 = 1 left over.' },
      { q:'29 ÷ 5 — what is the remainder?', a:4, why:'5 × 5 = 25, and 29 − 25 = 4.' },
      { q:'17 ÷ 3 — what is the remainder?', a:2, why:'5 × 3 = 15, and 17 − 15 = 2.' },
      { q:'50 ÷ 7 — what is the remainder?', a:1, why:'7 × 7 = 49, and 50 − 49 = 1.' },
      { q:'7 milbils share 30 grapes. How many grapes are left over?', a:2, why:'4 each uses 28, so 2 are left on the plate.' },
      { q:'45 ÷ 6 — what is the remainder?', a:3, why:'7 × 6 = 42, and 45 − 42 = 3.' },
    ]},
    { n:6, name:'Factors and Multiples', ac:'AC9M4N02', teach:'What divides into a number, and what it divides into.', qs:[
      { q:'Is 24 a multiple of 6?', pick:['Yes','No'], a:0, why:'Yes — 6 × 4 = 24, so 24 is in the six times table.' },
      { q:'Which of these is a factor of 20?', pick:['3','6','5'], a:2, why:'5 divides into 20 exactly (4 times). 3 and 6 do not.' },
      { q:'What is the biggest factor of 18 that is smaller than 18?', a:9, why:'18 = 2 × 9, so 9 is the biggest factor below 18 itself.' },
      { q:'Which is a multiple of 7?', pick:['27','42','52'], a:1, why:'6 × 7 = 42.' },
      { q:'How many factors does 10 have?', a:4, hint:'List them: which numbers divide into 10 exactly?', why:'1, 2, 5 and 10 — four factors.' },
      { q:'Is 7 a factor of 56?', pick:['Yes','No'], a:0, why:'Yes — 7 × 8 = 56.' },
      { q:'What is the smallest number that is a multiple of BOTH 3 and 4?', a:12, why:'3, 6, 9, **12** … and 4, 8, **12** … They first meet at 12.' },
    ]},
    { n:7, name:'Fractions of a Shape', ac:'AC9M4N03', teach:'Equal pieces, and how to name them.', qs:[
      { q:'A pizza is cut into 8 equal slices. You eat 1. What fraction did you eat?', pick:['1/4','1/8','8/1'], a:1, why:'One piece out of eight equal pieces is 1/8.' },
      { q:'A bar is cut into 4 equal parts and 3 are shaded. What fraction is shaded?', pick:['3/4','1/3','4/3'], a:0, why:'3 shaded out of 4 parts: 3/4.' },
      { q:'How many quarters make a whole?', a:4, why:'Four quarters make one whole.' },
      { q:'How many halves make a whole?', a:2, why:'Two halves make one whole.' },
      { q:'How many fifths make a whole?', a:5, why:'Five fifths make one whole — the bottom number always tells you.' },
      { q:'Which is bigger, 1/2 or 1/4?', pick:['1/2','1/4'], a:0, why:'Halves are bigger pieces than quarters, because fewer people are sharing.' },
    ]},
    { n:8, name:'Fractions of a Number', ac:'AC9M4N03', teach:'Divide by the bottom, multiply by the top.', qs:[
      { q:'1/2 of 18', a:9, big:true, why:'18 ÷ 2 = 9.' },
      { q:'1/4 of 20', a:5, big:true, why:'20 ÷ 4 = 5.' },
      { q:'1/3 of 27', a:9, big:true, why:'27 ÷ 3 = 9.' },
      { q:'3/4 of 20', a:15, big:true, hint:'Find 1/4 first, then take three of them.', why:'20 ÷ 4 = 5, and 5 × 3 = 15.' },
      { q:'2/5 of 30', a:12, big:true, why:'30 ÷ 5 = 6, and 6 × 2 = 12.' },
      { q:'1/10 of 90', a:9, big:true, why:'90 ÷ 10 = 9.' },
      { q:'2/3 of 24', a:16, big:true, why:'24 ÷ 3 = 8, and 8 × 2 = 16.' },
    ]},
    { n:9, name:'Equivalent Fractions', ac:'AC9M4N04', teach:'Different names for exactly the same amount.', qs:[
      { q:'1/2 = ?/4', a:2, why:'The bottom doubled, so the top doubles too: 2/4.' },
      { q:'1/3 = ?/9', a:3, why:'The bottom was multiplied by 3, so the top is too: 3/9.' },
      { q:'2/5 = ?/10', a:4, why:'The bottom doubled, so 2 doubles to 4: 4/10.' },
      { q:'3/4 = ?/8', a:6, why:'The bottom doubled, so 3 doubles to 6: 6/8.' },
      { q:'Which is the same as 1/2?', pick:['3/5','5/10','2/5'], a:1, why:'5 is half of 10, so 5/10 is one half.' },
      { q:'Simplify 4/8', pick:['1/2','2/4','1/4'], a:0, why:'Both divide by 4: 4/8 = 1/2. 2/4 is also equal but not yet simplest.' },
      { q:'Simplify 6/9', pick:['2/3','3/6','1/3'], a:0, why:'Both divide by 3: 6/9 = 2/3.' },
    ]},
    { n:10, name:'Stage 2 Check-up', ac:'Stage 2 review', checkup:true, teach:'Ten questions from everything in Stage 2.', qs:[
      { q:'8 × 7', a:56, big:true, why:'56 — the same as 7 × 8.' },
      { q:'54 ÷ 6', a:9, big:true, why:'9 × 6 = 54.' },
      { q:'23 ÷ 4 — what is the remainder?', a:3, why:'5 × 4 = 20, and 23 − 20 = 3.' },
      { q:'3/4 of 16', a:12, big:true, why:'16 ÷ 4 = 4, and 4 × 3 = 12.' },
      { q:'Which is a factor of 30?', pick:['4','7','6'], a:2, why:'6 × 5 = 30, so 6 is a factor. 4 and 7 do not divide 30 exactly.' },
      { q:'1/2 = ?/6', a:3, why:'3 is half of 6, so 3/6 = 1/2.' },
      { q:'9 × 6', a:54, big:true, why:'60 − 6 = 54.' },
      { q:'6 milbils share 42 stickers equally. How many each?', a:7, why:'42 ÷ 6 = 7.' },
      { q:'Which is bigger, 2/3 or 1/3?', pick:['2/3','1/3'], a:0, why:'Same size pieces, but two of them instead of one.' },
      { q:'12 × 12', a:144, big:true, why:'A dozen dozen: 144.' },
    ]},
  ],
},

// ══════════════════════════════════════════════════════════ STAGE 3 ══════
{
  id: 3,
  name: 'Decimals, Measuring and Shape',
  short: 'Decimals',
  year: 'Year 5 · Number, Measurement & Space',
  icon: '📐',
  colour: '#9b5de5',
  tint: '#f1e8ff',
  blurb: 'The dot in a number, percentages, and measuring real things.',

  lessons: [
    { n:1, name:'Tenths and Hundredths', ac:'AC9M5N01', teach:'Reading what is on the right of the dot.', qs:[
      { q:'What is 0.1 as a fraction?', pick:['1/10','1/100','10/1'], a:0, why:'The first column after the dot is tenths, so 0.1 = 1/10.' },
      { q:'In 3.47, what is the 4 worth?', pick:['4 tenths','4 hundredths','4 ones'], a:0, why:'The first column after the dot is tenths.' },
      { q:'Which is bigger?', pick:['0.5','0.45'], a:0, hint:'Write 0.5 as 0.50 and compare.', why:'0.50 against 0.45 — five tenths beats four tenths.' },
      { q:'Write 7/10 as a decimal', a:0.7, why:'Seven tenths goes straight into the tenths column: 0.7.' },
      { q:'Write 0.25 as a fraction', pick:['1/4','1/25','2/5'], a:0, why:'0.25 is 25 hundredths, and 25/100 simplifies to 1/4.' },
      { q:'Which is smallest?', pick:['0.09','0.9','0.19'], a:0, why:'0.09 has 0 tenths. The other two have 9 and 1 tenths.' },
      { q:'Write 3/100 as a decimal', a:0.03, hint:'You need the hundredths column, so the tenths column needs a 0.', why:'Three hundredths is 0.03.' },
    ]},
    { n:2, name:'Adding and Subtracting Decimals', ac:'AC9M5N05', teach:'Line up the dots, then do it as normal.', qs:[
      { q:'0.4 + 0.3', a:0.7, big:true, why:'Four tenths plus three tenths is seven tenths.' },
      { q:'1.5 + 2.7', a:4.2, big:true, why:'0.5 + 0.7 = 1.2, so carry the 1: 1 + 2 + 1 = 4. Answer 4.2.' },
      { q:'5.0 − 1.6', a:3.4, big:true, why:'5 − 1.6 = 3.4. Check: 3.4 + 1.6 = 5.' },
      { q:'3.25 + 1.5', a:4.75, big:true, hint:'Write 1.5 as 1.50 so the columns line up.', why:'3.25 + 1.50 = 4.75.' },
      { q:'10 − 2.35', a:7.65, big:true, why:'10 − 2.35 = 7.65. Check: 7.65 + 2.35 = 10.' },
      { q:'0.8 + 0.8', a:1.6, big:true, why:'Eight tenths twice is sixteen tenths, which is 1.6.' },
      { q:'6.4 − 2.9', a:3.5, big:true, why:'Take 3 and give 0.1 back: 6.4 − 3 = 3.4, + 0.1 = 3.5.' },
    ]},
    { n:3, name:'×10, ×100 and ×1000', ac:'AC9M5N04', teach:'Digits sliding left and right past the dot.', qs:[
      { q:'4.5 × 10', a:45, big:true, why:'Every digit moves one column left: 45.' },
      { q:'0.6 × 100', a:60, big:true, why:'Two columns left: 0.6 → 6 → 60.' },
      { q:'72 ÷ 10', a:7.2, big:true, why:'One column right: 7.2.' },
      { q:'350 ÷ 100', a:3.5, big:true, why:'Two columns right: 350 → 35 → 3.5.' },
      { q:'2.5 × 1000', a:2500, big:true, why:'Three columns left: 2.5 → 25 → 250 → 2500.' },
      { q:'9 ÷ 1000', a:0.009, hint:'Three columns right. You will need two zeros as place holders.', why:'9 → 0.9 → 0.09 → 0.009.' },
      { q:'0.07 × 100', a:7, big:true, why:'Two columns left: 0.07 → 0.7 → 7.' },
    ]},
    { n:4, name:'Percentages', ac:'AC9M5N08', teach:'Finding a percentage of an amount.', qs:[
      { q:'50% of 60', a:30, big:true, why:'50% is a half: 60 ÷ 2 = 30.' },
      { q:'10% of 80', a:8, big:true, why:'10% is a tenth: 80 ÷ 10 = 8.' },
      { q:'25% of 40', a:10, big:true, hint:'A quarter — halve it twice.', why:'40 → 20 → 10.' },
      { q:'100% of 17', a:17, big:true, why:'100% is all of it, so nothing changes.' },
      { q:'20% of 50', a:10, big:true, why:'10% of 50 is 5, so 20% is 10.' },
      { q:'75% of 40', a:30, big:true, hint:'50% + 25%.', why:'Half is 20 and a quarter is 10, so 75% is 30.' },
      { q:'5% of 200', a:10, big:true, why:'10% of 200 is 20, so 5% is half of that: 10.' },
    ]},
    { n:5, name:'Fractions, Decimals and Percentages', ac:'AC9M5N08', teach:'The same amount wearing three different outfits.', qs:[
      { q:'1/2 as a percentage', a:50, unit:'%', why:'A half is 50 out of 100.' },
      { q:'0.25 as a percentage', a:25, unit:'%', why:'Multiply a decimal by 100: 0.25 → 25%.' },
      { q:'10% as a decimal', a:0.1, why:'Divide a percentage by 100: 10 → 0.1.' },
      { q:'3/4 as a percentage', a:75, unit:'%', why:'Three quarters of 100 is 75.' },
      { q:'Which is biggest?', pick:['0.6','55%','1/2'], a:0, hint:'Turn them all into percentages.', why:'0.6 is 60%, which beats 55% and 50%.' },
      { q:'1/5 as a decimal', a:0.2, why:'1 ÷ 5 = 0.2. (Or: a fifth is two tenths.)' },
      { q:'80% as a fraction in its simplest form', pick:['4/5','8/10','8/100'], a:0, why:'80/100 divides by 20 to give 4/5. 8/10 is equal but not simplest.' },
    ]},
    { n:6, name:'Length, Mass and Capacity', ac:'AC9M5M01', teach:'Metric units, and the 10s and 1000s between them.', qs:[
      { q:'How many centimetres in 3 metres?', a:300, unit:'cm', why:'100 cm in a metre, so 3 × 100 = 300 cm.' },
      { q:'How many millimetres in 7 cm?', a:70, unit:'mm', why:'10 mm in a centimetre, so 7 × 10 = 70 mm.' },
      { q:'How many grams in 2 kg?', a:2000, unit:'g', why:'Kilo means a thousand: 2 × 1000 = 2000 g.' },
      { q:'How many millilitres in 1.5 L?', a:1500, unit:'mL', why:'1000 mL in a litre, so 1.5 L is 1500 mL.' },
      { q:'How many metres in 2.4 km?', a:2400, unit:'m', why:'1000 m in a kilometre: 2.4 × 1000 = 2400 m.' },
      { q:'Which is heavier?', pick:['900 g','1 kg'], a:1, why:'1 kg is 1000 g, which beats 900 g.' },
      { q:'250 mL + 750 mL = ? litres', a:1, unit:'L', why:'250 + 750 = 1000 mL, which is exactly 1 litre.' },
    ]},
    { n:7, name:'Perimeter and Area', ac:'AC9M5M02', teach:'The fence round it, and the carpet inside it.', qs:[
      { q:'A square has sides of 5 cm. What is its perimeter?', a:20, unit:'cm', why:'Four sides of 5: 5 × 4 = 20 cm.' },
      { q:'A rectangle is 6 cm by 4 cm. What is its area?', a:24, unit:'cm²', why:'Area = long × short = 6 × 4 = 24 cm².' },
      { q:'A rectangle is 8 m by 3 m. What is its perimeter?', a:22, unit:'m', hint:'Add one long and one short side, then double.', why:'8 + 3 = 11, doubled is 22 m.' },
      { q:'A square has an area of 36 cm². How long is one side?', a:6, unit:'cm', why:'6 × 6 = 36, so each side is 6 cm.' },
      { q:'A rectangle is 10 cm by 2 cm. What is its area?', a:20, unit:'cm²', why:'10 × 2 = 20 cm².' },
      { q:'A square has a perimeter of 28 cm. How long is one side?', a:7, unit:'cm', why:'28 ÷ 4 = 7 cm.' },
      { q:'A rectangle is 7 m by 5 m. What is its area?', a:35, unit:'m²', why:'7 × 5 = 35 m².' },
    ]},
    { n:8, name:'Angles', ac:'AC9M5SP01', teach:'Measuring corners in degrees.', qs:[
      { q:'How many degrees in a right angle?', a:90, unit:'°', why:'A right angle — the corner of a page — is 90°.' },
      { q:'How many degrees in a straight line?', a:180, unit:'°', why:'Two right angles side by side: 180°.' },
      { q:'How many degrees all the way round?', a:360, unit:'°', why:'A full turn is 360° — four right angles.' },
      { q:'An angle of 45° is…', pick:['Acute','Obtuse','Reflex'], a:0, why:'Anything under 90° is **acute** — a sharp little angle.' },
      { q:'An angle of 130° is…', pick:['Acute','Obtuse','Reflex'], a:1, why:'Between 90° and 180° is **obtuse** — a wide open angle.' },
      { q:'Two angles sit on a straight line. One is 60°. What is the other?', a:120, unit:'°', why:'They must add to 180°, so 180 − 60 = 120°.' },
      { q:'The three angles in a triangle add up to how many degrees?', a:180, unit:'°', why:'Always 180°, in every triangle there has ever been.' },
    ]},
    { n:9, name:'Time and Timetables', ac:'AC9M5M03', teach:'24-hour time, and how long things take.', qs:[
      { q:'How many minutes in 2 hours?', a:120, why:'60 minutes an hour, so 2 × 60 = 120.' },
      { q:'Write 3:45 pm in 24-hour time', pick:['15:45','03:45','13:45'], a:0, why:'Keep counting past 12: 3 pm is 15:00, so 15:45.' },
      { q:'A film starts at 6:15 pm and runs 90 minutes. When does it finish?', pick:['7:45 pm','7:15 pm','8:15 pm'], a:0, why:'90 minutes is 1 hour 30. 6:15 + 1 hour = 7:15, + 30 min = 7:45 pm.' },
      { q:'How many seconds in 5 minutes?', a:300, why:'60 seconds a minute: 5 × 60 = 300.' },
      { q:'Write 09:20 in am/pm time', pick:['9:20 am','9:20 pm'], a:0, why:'Anything before 12:00 is am — morning.' },
      { q:'From 10:40 am to 11:25 am, how many minutes?', a:45, hint:'Hop to 11:00 first.', why:'10:40 → 11:00 is 20 minutes, then 25 more: 45.' },
      { q:'How many hours in 3 days?', a:72, why:'24 hours a day: 3 × 24 = 72.' },
    ]},
    { n:10, name:'Stage 3 Check-up', ac:'Stage 3 review', checkup:true, teach:'Ten questions from everything in Stage 3.', qs:[
      { q:'2.5 + 1.75', a:4.25, big:true, why:'Write 2.5 as 2.50: 2.50 + 1.75 = 4.25.' },
      { q:'30% of 70', a:21, big:true, why:'10% of 70 is 7, so 30% is 21.' },
      { q:'6.4 × 10', a:64, big:true, why:'Everything slides one column left: 64.' },
      { q:'How many mL in 2.5 L?', a:2500, unit:'mL', why:'2.5 × 1000 = 2500 mL.' },
      { q:'A rectangle is 9 cm by 4 cm. What is its area?', a:36, unit:'cm²', why:'9 × 4 = 36 cm².' },
      { q:'Two angles sit on a straight line. One is 115°. What is the other?', a:65, unit:'°', why:'180 − 115 = 65°.' },
      { q:'Write 1/4 as a percentage', a:25, unit:'%', why:'A quarter of 100 is 25.' },
      { q:'100 − 0.5', a:99.5, big:true, why:'Half a unit below 100 is 99.5.' },
      { q:'How many minutes from 2:50 pm to 3:30 pm?', a:40, why:'10 minutes to 3:00, then 30 more: 40.' },
      { q:'Which is biggest?', pick:['0.35','1/4','30%'], a:0, why:'0.35 is 35%, which beats 30% and 25%.' },
    ]},
  ],
},

// ══════════════════════════════════════════════════════════ STAGE 4 ══════
{
  id: 4,
  name: 'Algebra, Integers and Chance',
  short: 'Algebra',
  year: 'Year 6–7 · Algebra, Number & Probability',
  icon: '🧮',
  colour: '#e5484d',
  tint: '#ffe6e6',
  blurb: 'Letters standing in for numbers, numbers below zero, and working out the odds.',

  lessons: [
    { n:1, name:'Order of Operations', ac:'AC9M6N07', teach:'BIDMAS: the order everybody has agreed on.', qs:[
      { q:'3 + 4 × 2', a:11, big:true, hint:'Multiplying happens before adding.', why:'4 × 2 = 8 first, then 3 + 8 = 11.' },
      { q:'(3 + 4) × 2', a:14, big:true, why:'Brackets first: 3 + 4 = 7, then 7 × 2 = 14.' },
      { q:'20 − 6 ÷ 2', a:17, big:true, why:'Divide first: 6 ÷ 2 = 3, then 20 − 3 = 17.' },
      { q:'10 + 2 × 5 − 3', a:17, big:true, why:'2 × 5 = 10 first, then 10 + 10 − 3 = 17.' },
      { q:'(8 + 4) ÷ 3', a:4, big:true, why:'Brackets first: 12 ÷ 3 = 4.' },
      { q:'5 × (6 − 2)', a:20, big:true, why:'Brackets first: 6 − 2 = 4, then 5 × 4 = 20.' },
      { q:'36 ÷ (3 × 3)', a:4, big:true, why:'Brackets first: 3 × 3 = 9, then 36 ÷ 9 = 4.' },
    ]},
    { n:2, name:'Negative Numbers', ac:'AC9M7N01', teach:'The numbers that live below zero.', qs:[
      { q:'What number is 3 steps below 0?', a:-3, why:'Counting down past zero: −1, −2, −3.' },
      { q:'Which is colder?', pick:['−5°C','−12°C'], a:1, why:'The further below zero, the colder. −12 is colder than −5.' },
      { q:'What number is 4 less than 1?', a:-3, why:'1 − 4 = −3. You go past zero by 3.' },
      { q:'Smallest first — which comes FIRST?', pick:['−2','−7','3'], a:1, why:'−7 is furthest below zero, so it is the smallest.' },
      { q:'The temperature is −3°C and rises 5°. What is it now?', a:2, unit:'°C', why:'−3 + 5: up 3 gets you to 0, then 2 more: 2°C.' },
      { q:'How far apart are −4 and 2 on a number line?', a:6, hint:'Count up to zero first.', why:'−4 to 0 is 4 steps, 0 to 2 is 2 more: 6 altogether.' },
      { q:'Which is bigger, −1 or −9?', pick:['−1','−9'], a:0, why:'−1 is only just below zero, so it is the bigger of the two.' },
    ]},
    { n:3, name:'Adding and Subtracting Integers', ac:'AC9M7N06', teach:'Moving forwards and backwards along the number line.', qs:[
      { q:'−5 + 8', a:3, big:true, hint:'Start at −5 and walk 8 steps forwards.', why:'−5 + 5 = 0, then 3 more: 3.' },
      { q:'4 − 9', a:-5, big:true, why:'4 − 4 = 0, then 5 more backwards: −5.' },
      { q:'−3 − 4', a:-7, big:true, why:'Already below zero, going 4 further down: −7.' },
      { q:'−10 + 10', a:0, big:true, why:'Ten steps forwards from −10 lands exactly on zero.' },
      { q:'7 − (−2)', a:9, big:true, hint:'Taking away a negative is the same as adding.', why:'Two minus signs cancel: 7 + 2 = 9.' },
      { q:'−6 + 2', a:-4, big:true, why:'Two steps up from −6 is −4.' },
      { q:'−2 − (−5)', a:3, big:true, why:'Two minus signs cancel: −2 + 5 = 3.' },
    ]},
    { n:4, name:'Powers and Square Numbers', ac:'AC9M7N01', teach:'The little number up high, and how to undo it.', qs:[
      { q:'5²', a:25, big:true, why:'5 × 5 = 25.' },
      { q:'9²', a:81, big:true, why:'9 × 9 = 81.' },
      { q:'2³', a:8, big:true, hint:'Three 2s multiplied together.', why:'2 × 2 × 2 = 8.' },
      { q:'10³', a:1000, big:true, why:'10 × 10 × 10 = 1000.' },
      { q:'The square root of 49', a:7, big:true, why:'7 × 7 = 49, so √49 = 7.' },
      { q:'12²', a:144, big:true, why:'12 × 12 = 144.' },
      { q:'The square root of 100', a:10, big:true, why:'10 × 10 = 100, so √100 = 10.' },
    ]},
    { n:5, name:'Letters for Numbers', ac:'AC9M7A01', teach:'Algebra: a letter is just a number in a hat.', qs:[
      { q:'If n = 5, what is n + 7?', a:12, big:true, why:'Swap n for 5: 5 + 7 = 12.' },
      { q:'If a = 3, what is 4a?', a:12, big:true, hint:'4a means 4 × a.', why:'4 × 3 = 12.' },
      { q:'If x = 10, what is 2x − 4?', a:16, big:true, why:'2 × 10 = 20, then 20 − 4 = 16.' },
      { q:'Simplify 3n + 2n', pick:['5n','6n','5n²'], a:0, why:'Three ns plus two ns is five ns. You are counting, not multiplying.' },
      { q:'If y = 6, what is y²?', a:36, big:true, why:'6 × 6 = 36.' },
      { q:'Simplify 7a − 3a', pick:['4a','10a','4'], a:0, why:'Seven as take away three as leaves four as: 4a.' },
      { q:'A milbil buys n cakes at $4 each. What does it cost?', pick:['4n','n + 4','n ÷ 4'], a:0, why:'n cakes at $4 each is 4 × n, written 4n.' },
    ]},
    { n:6, name:'Solving Simple Equations', ac:'AC9M7A02', teach:'Undoing whatever was done to x.', qs:[
      { q:'x + 7 = 12. What is x?', a:5, big:true, hint:'Take 7 off both sides.', why:'12 − 7 = 5, so x = 5.' },
      { q:'x − 4 = 9. What is x?', a:13, big:true, why:'Add 4 to both sides: x = 13.' },
      { q:'3x = 21. What is x?', a:7, big:true, why:'Divide both sides by 3: x = 7.' },
      { q:'x ÷ 2 = 8. What is x?', a:16, big:true, why:'Multiply both sides by 2: x = 16.' },
      { q:'2x + 1 = 11. What is x?', a:5, big:true, hint:'Undo the +1 first, then the ×2.', why:'11 − 1 = 10, then 10 ÷ 2 = 5.' },
      { q:'5x − 3 = 12. What is x?', a:3, big:true, why:'12 + 3 = 15, then 15 ÷ 5 = 3.' },
      { q:'x + x + x = 18. What is x?', a:6, big:true, why:'Three xs make 18, so each x is 18 ÷ 3 = 6.' },
    ]},
    { n:7, name:'Ratio and Rate', ac:'AC9M7N08', teach:'Shares that are not equal, and how fast things go.', qs:[
      { q:'Share $20 between two milbils in the ratio 1:3. How much does the SECOND get?', a:15, money:true, hint:'1 + 3 = 4 parts. How big is one part?', why:'Each part is $5. The second gets 3 parts: $15.' },
      { q:'Simplify the ratio 4:8', pick:['1:2','2:4','1:4'], a:0, why:'Both divide by 4: 1:2. (2:4 is equal but not simplest.)' },
      { q:'A car drives 120 km in 2 hours. What is its speed in km/h?', a:60, unit:'km/h', why:'120 ÷ 2 = 60 km every hour.' },
      { q:'Mix cordial and water 1:4. For 2 cups of cordial, how many cups of water?', a:8, unit:'cups', why:'Four times as much water as cordial: 2 × 4 = 8.' },
      { q:'Simplify the ratio 10:15', pick:['2:3','1:5','5:10'], a:0, why:'Both divide by 5: 2:3.' },
      { q:'3 pencils cost $6. How much do 5 cost?', a:10, money:true, hint:'Work out one pencil first.', why:'One pencil is $2, so 5 cost $10.' },
      { q:'Share 24 lollies in the ratio 1:2. How many in the BIGGER share?', a:16, why:'1 + 2 = 3 parts of 8. The bigger share is 2 parts: 16.' },
    ]},
    { n:8, name:'Chance', ac:'AC9M7P01', teach:'Probability: wanted outcomes over possible outcomes.', qs:[
      { q:'You flip a fair coin. What is the chance of heads?', pick:['1/2','1/4','1'], a:0, why:'One wanted face out of two possible: 1/2.' },
      { q:'You roll a normal dice. What is the chance of a 3?', pick:['1/3','1/6','3/6'], a:1, why:'One face out of six: 1/6.' },
      { q:'A bag has 2 red and 3 blue marbles. What is the chance of red?', pick:['2/5','2/3','3/5'], a:0, why:'2 red out of 5 marbles altogether: 2/5.' },
      { q:'What is the chance of rolling an even number on a dice?', pick:['1/2','1/3','2/3'], a:0, why:'2, 4 and 6 — three faces out of six, which is 1/2.' },
      { q:'Write the chance of something CERTAIN as a number', a:1, why:'Certain is 1. Impossible is 0. Everything else sits between.' },
      { q:'What is the chance of rolling a 7 on a normal dice?', a:0, why:'There is no 7 on a dice, so it is impossible: 0.' },
      { q:'As a percentage, what is the chance of heads on a coin?', a:50, unit:'%', why:'1/2 is 50%.' },
    ]},
    { n:9, name:'Mean, Median, Mode and Range', ac:'AC9M7ST02', teach:'Four different ways to sum up a pile of numbers.', qs:[
      { q:'Find the MEAN of 3, 7, 7, 9, 14', a:8, hint:'Add them all up, then divide by how many there are.', why:'They add to 40, and 40 ÷ 5 = 8.' },
      { q:'Find the MEDIAN of 3, 7, 7, 9, 14', a:7, why:'Already in order — the middle one of five is the third: 7.' },
      { q:'Find the MODE of 3, 7, 7, 9, 14', a:7, why:'7 appears twice and everything else once, so 7 is the mode.' },
      { q:'Find the RANGE of 3, 7, 7, 9, 14', a:11, why:'Biggest take away smallest: 14 − 3 = 11.' },
      { q:'Find the MEAN of 4, 6, 8, 10', a:7, why:'They add to 28, and 28 ÷ 4 = 7.' },
      { q:'Find the MEDIAN of 2, 5, 9, 11', a:7, hint:'With an even list, take the mean of the middle two.', why:'The middle two are 5 and 9, and halfway between them is 7.' },
      { q:'Find the RANGE of 12, 3, 20, 8', a:17, why:'20 − 3 = 17.' },
    ]},
    { n:10, name:'Stage 4 Check-up', ac:'Stage 4 review', checkup:true, teach:'Ten questions from everything in Stage 4 — the last lesson in MilMATHS.', qs:[
      { q:'6 + 3 × 4', a:18, big:true, why:'Multiply first: 3 × 4 = 12, then 6 + 12 = 18.' },
      { q:'−7 + 12', a:5, big:true, why:'Seven steps up gets you to 0, then 5 more: 5.' },
      { q:'8²', a:64, big:true, why:'8 × 8 = 64.' },
      { q:'If n = 4, what is 3n − 5?', a:7, big:true, why:'3 × 4 = 12, then 12 − 5 = 7.' },
      { q:'4x = 36. What is x?', a:9, big:true, why:'Divide both sides by 4: x = 9.' },
      { q:'Simplify the ratio 6:9', pick:['2:3','3:2','1:3'], a:0, why:'Both divide by 3: 2:3.' },
      { q:'What is the chance of rolling a number BIGGER than 4 on a dice?', pick:['1/3','1/6','2/3'], a:0, why:'Only 5 and 6 work — 2 faces out of 6, which simplifies to 1/3.' },
      { q:'Find the mean of 5, 10, 15', a:10, why:'They add to 30, and 30 ÷ 3 = 10.' },
      { q:'−4 − 6', a:-10, big:true, why:'Already 4 below zero, going 6 further down: −10.' },
      { q:'The square root of 81', a:9, big:true, why:'9 × 9 = 81.' },
    ]},
  ],
},

];

// ============================================================ stage tests ===
//
// One at the end of every stage, between you and the next one. Fifteen
// questions, all on material the stage has already taught but asked in a
// harder way — bigger numbers, two steps instead of one, a fact turned round.
//
// A test is not a lesson. You get **one go** at each question, the only gadget
// allowed is the scratch pad, and **more than three wrong means doing the
// whole stage again**.

export const PASS_WRONG = 3;      // this many wrong is still a pass

export const TESTS = {

  1: { name:'Stage 1 Test', sub:'Numbers and Place Value', qs:[
    { q:'In 4702, what is the 7 worth?', pick:['7','70','700'], a:2, why:'The 7 sits in the hundreds column: 700.' },
    { q:'386 + 247', a:633, big:true, why:'6+7=13 carry 1; 8+4+1=13 carry 1; 3+2+1=6. Answer 633.' },
    { q:'804 − 356', a:448, big:true, why:'804 − 356 = 448. Check: 448 + 356 = 804.' },
    { q:'Round 2749 to the nearest 100', a:2700, why:'The tens digit is 4, so it rounds down to 2700.' },
    { q:'Round 1850 to the nearest 100', a:1900, why:'1850 is exactly halfway, and halves round up: 1900.' },
    { q:'1000 − 437', a:563, big:true, why:'563 and 437 add up to 1000.' },
    { q:'Which is biggest?', pick:['4071','4710','4107'], a:1, why:'All have 4 thousands. 4710 has 7 hundreds, which beats 1 and 0.' },
    { q:'275 + 275 + 275', a:825, big:true, why:'Three lots of 275. 275 + 275 = 550, and 550 + 275 = 825.' },
    { q:'A milbil has $20 and spends $13.65. How much change?', a:6.35, money:true, why:'$13.65 + 35c = $14, + $6 = $20. The change is $6.35.' },
    { q:'How many 50c coins make $7.50?', a:15, why:'$7.50 is 750 cents, and 750 ÷ 50 = 15.' },
    { q:'Count by 6s: 18, 24, 30, ?', a:36, why:'30 + 6 = 36.' },
    { q:'Double 185', a:370, big:true, why:'185 + 185 = 370.' },
    { q:'Half of 246', a:123, big:true, why:'123 + 123 = 246.' },
    { q:'512 − 199', a:313, big:true, why:'Take 200 and give 1 back: 512 − 200 = 312, + 1 = 313.' },
    { q:'Write six hundred and five as a number', a:605, why:'Six hundreds, no tens, five ones. The 0 holds the tens column open.' },
  ]},

  2: { name:'Stage 2 Test', sub:'Times, Shares and Fractions', qs:[
    { q:'12 × 7', a:84, big:true, why:'10 × 7 = 70 and 2 × 7 = 14. Together, 84.' },
    { q:'96 ÷ 8', a:12, big:true, why:'12 × 8 = 96.' },
    { q:'11 × 9', a:99, big:true, why:'Eleven nines: 99.' },
    { q:'72 ÷ 12', a:6, big:true, why:'6 × 12 = 72.' },
    { q:'59 ÷ 8 — what is the remainder?', a:3, why:'7 × 8 = 56, and 59 − 56 = 3.' },
    { q:'2/3 of 45', a:30, big:true, why:'45 ÷ 3 = 15, and 15 × 2 = 30.' },
    { q:'5/6 of 42', a:35, big:true, why:'42 ÷ 6 = 7, and 7 × 5 = 35.' },
    { q:'Which of these is a factor of 48 but NOT of 36?', pick:['6','8','12'], a:1, why:'48 ÷ 8 = 6 exactly, but 36 does not divide by 8. The other two divide into both.' },
    { q:'What is the smallest number that is a multiple of BOTH 4 and 6?', a:12, why:'4, 8, **12** … and 6, **12** … They first meet at 12.' },
    { q:'Simplify 12/18', pick:['2/3','3/4','6/9'], a:0, why:'Both divide by 6: 2/3. (6/9 is equal but not simplest.)' },
    { q:'3/5 = ?/20', a:12, why:'The bottom was multiplied by 4, so the top is too: 12/20.' },
    { q:'Which is bigger, 3/4 or 2/3?', pick:['3/4','2/3'], a:0, why:'Over twelfths: 3/4 is 9/12 and 2/3 is 8/12.' },
    { q:'A box holds 8 cakes. How many boxes do you need for 96 cakes?', a:12, why:'96 ÷ 8 = 12 boxes.' },
    { q:'Share 100 stickers between 8 milbils. How many are left over?', a:4, why:'12 each uses 96, so 4 are left.' },
    { q:'How many factors does 24 have?', a:8, why:'1, 2, 3, 4, 6, 8, 12 and 24 — eight of them.' },
  ]},

  3: { name:'Stage 3 Test', sub:'Decimals, Measuring and Shape', qs:[
    { q:'3.6 + 2.85', a:6.45, big:true, why:'Write 3.6 as 3.60: 3.60 + 2.85 = 6.45.' },
    { q:'20 − 7.35', a:12.65, big:true, why:'20 − 7.35 = 12.65. Check: 12.65 + 7.35 = 20.' },
    { q:'0.45 × 100', a:45, big:true, why:'Two columns left: 0.45 → 4.5 → 45.' },
    { q:'6 ÷ 100', a:0.06, why:'Two columns right: 6 → 0.6 → 0.06.' },
    { q:'15% of 60', a:9, big:true, why:'10% is 6 and 5% is 3, so 15% is 9.' },
    { q:'40% of 250', a:100, big:true, why:'10% of 250 is 25, so 40% is 100.' },
    { q:'Write 0.08 as a percentage', a:8, unit:'%', why:'Multiply by 100: 0.08 → 8%.' },
    { q:'Which is biggest?', pick:['0.7','3/4','72%'], a:1, why:'3/4 is 75%, which beats 72% and 70%.' },
    { q:'How many centimetres in 4.5 metres?', a:450, unit:'cm', why:'4.5 × 100 = 450 cm.' },
    { q:'A rectangle is 12 cm by 7 cm. What is its area?', a:84, unit:'cm²', why:'12 × 7 = 84 cm².' },
    { q:'A rectangle has an area of 48 cm² and is 6 cm long. How wide is it?', a:8, unit:'cm', why:'48 ÷ 6 = 8 cm.' },
    { q:'A square has a perimeter of 36 m. What is its area?', a:81, unit:'m²', why:'Each side is 36 ÷ 4 = 9 m, so the area is 9 × 9 = 81 m².' },
    { q:'Two angles sit on a straight line. One is 47°. What is the other?', a:133, unit:'°', why:'180 − 47 = 133°.' },
    { q:'A triangle has angles of 90° and 35°. What is the third?', a:55, unit:'°', why:'The three add to 180, so 180 − 90 − 35 = 55°.' },
    { q:'A film starts at 7:40 pm and runs 95 minutes. When does it finish?', pick:['9:15 pm','9:05 pm','8:15 pm'], a:0, why:'95 minutes is 1 hour 35. 7:40 + 1 hour = 8:40, + 35 min = 9:15 pm.' },
  ]},

  4: { name:'Stage 4 Test', sub:'Algebra, Integers and Chance', qs:[
    { q:'4 + 5 × 3 − 2', a:17, big:true, why:'5 × 3 = 15 first, then 4 + 15 − 2 = 17.' },
    { q:'(12 − 4) × (2 + 3)', a:40, big:true, why:'Brackets first: 8 × 5 = 40.' },
    { q:'100 ÷ (5 × 4)', a:5, big:true, why:'Brackets first: 5 × 4 = 20, then 100 ÷ 20 = 5.' },
    { q:'−8 + 15', a:7, big:true, why:'Eight steps up reaches 0, then 7 more: 7.' },
    { q:'−6 − (−9)', a:3, big:true, why:'Two minus signs cancel: −6 + 9 = 3.' },
    { q:'3 − 11', a:-8, big:true, why:'Three steps down reaches 0, then 8 more below: −8.' },
    { q:'11²', a:121, big:true, why:'11 × 11 = 121.' },
    { q:'3³', a:27, big:true, why:'3 × 3 × 3 = 27.' },
    { q:'The square root of 144', a:12, big:true, why:'12 × 12 = 144.' },
    { q:'If x = 7, what is 5x − 12?', a:23, big:true, why:'5 × 7 = 35, then 35 − 12 = 23.' },
    { q:'4x + 3 = 31. What is x?', a:7, big:true, why:'31 − 3 = 28, then 28 ÷ 4 = 7.' },
    { q:'x ÷ 3 − 2 = 4. What is x?', a:18, big:true, why:'4 + 2 = 6, so x ÷ 3 = 6, so x = 18.' },
    { q:'Share $45 in the ratio 2:3. How much is the BIGGER share?', a:27, money:true, why:'2 + 3 = 5 parts of $9. The bigger share is 3 parts: $27.' },
    { q:'A bag has 4 red, 5 blue and 3 green marbles. What is the chance of blue?', pick:['5/12','5/7','1/3'], a:0, why:'5 blue out of 12 marbles altogether: 5/12.' },
    { q:'Find the mean of 6, 9, 11, 14', a:10, why:'They add to 40, and 40 ÷ 4 = 10.' },
  ]},
};

export const getTest = (stage) => TESTS[stage] ? { ...TESTS[stage], stage, isTest: true, n: 11 } : null;
export const testKey = (stage) => `t${stage}`;

// ------------------------------------------------------------- lookups ---

export const STAGE = Object.fromEntries(STAGES.map(s => [s.id, s]));

/** Every lesson, flat, each tagged with the stage it belongs to. */
export const ALL_LESSONS = STAGES.flatMap(s => s.lessons.map(l => ({ ...l, stage: s.id })));

/** 'm2-7' — the id a lesson is saved under. */
export const lessonKey = (stage, n) => `m${stage}-${n}`;

export const getLesson = (stage, n) => STAGE[stage]?.lessons.find(l => l.n === n) || null;

export const TOTAL_LESSONS = ALL_LESSONS.length;
export const TOTAL_QUESTIONS = ALL_LESSONS.reduce((n, l) => n + l.qs.length, 0)
  + Object.values(TESTS).reduce((n, t) => n + t.qs.length, 0);
