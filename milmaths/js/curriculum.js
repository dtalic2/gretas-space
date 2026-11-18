// ---------- The four stages of MilMATHS ----------
//
// Four stages. Each one is **thirty rows** on the map: twenty lessons with a
// comic standing in front of every other one, so a comic sets up the two
// lessons that follow it. The comics themselves live in books.js; this file
// is only the maths.
//
// Lessons are deliberately short — five or six questions — because a lesson
// is failed by getting three wrong, and because fifteen minutes after school
// does not stretch very far. The stages climb in the order school climbs in
// them, and every lesson names the part of the Australian Curriculum (v9.0)
// it comes from so a grown-up can see where it fits.
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
    { n:1, name:'Counting to 100', ac:'AC9M3N01', teach:'Counting on and counting back in ones.', qs:[
      { q:'What number comes after 59?', a:60, why:'59 + 1 = 60. The ones roll over and the tens tick up.' },
      { q:'What number comes before 40?', a:39, why:'Counting back from 40 you drop to 39.' },
      { q:'Count on by ones: 67, 68, 69, ?', a:70, why:'69 + 1 = 70.' },
      { q:'Which is biggest?', pick:['58','85','38'], a:1, why:'85 has 8 tens. The others have 5 and 3.' },
      { q:'What number comes after 99?', a:100, why:'Both columns are full, so they roll over and a hundreds column opens.' },
    ]},
    { n:2, name:'Counting and Ordering to 1000', ac:'AC9M3N01', teach:'The same counting, with hundreds in it.', qs:[
      { q:'What number comes after 499?', a:500, why:'499 + 1 = 500. The ones and tens both roll over to zero.' },
      { q:'What number comes before 700?', a:699, why:'Counting back from 700 you drop to 699 — six hundreds, nine tens, nine ones.' },
      { q:'Count on by ones: 297, 298, 299, ?', a:300, why:'299 + 1 = 300.' },
      { q:'Which number is biggest?', pick:['470','740','407'], a:1, hint:'Look at the hundreds first.', why:'740 has 7 hundreds. The other two have 4, so 740 wins before you look at the tens.' },
      { q:'What number comes after 999?', a:1000, why:'Every column is full, so a new thousands column opens: 1000.' },
    ]},
    { n:3, name:'Hundreds, Tens and Ones', ac:'AC9M3N01', teach:'What each digit in a number is actually worth.', qs:[
      { q:'In 472, what is the 4 worth?', pick:['4','40','400'], a:2, hint:'Which column is the 4 sitting in?', why:'It sits in the hundreds column, so it is worth 400.' },
      { q:'In 836, what is the 3 worth?', pick:['3','30','300'], a:1, why:'The 3 is in the tens column: 3 tens = 30.' },
      { q:'How many tens make 70?', a:7, why:'7 × 10 = 70, so seven tens make 70.' },
      { q:'Which one is 5 hundreds, 2 tens and 6 ones?', pick:['526','625','256'], a:0, why:'5 in the hundreds, 2 in the tens, 6 in the ones: 526.' },
      { q:'Write the number: 3 hundreds, 0 tens, 9 ones', a:309, why:'The 0 holds the tens column open, so it is 309 and not 39.' },
    ]},
    { n:4, name:'Expanded Form', ac:'AC9M3N01', teach:'Taking a number apart and putting it back together.', qs:[
      { q:'600 + 40 + 7', a:647, big:true, why:'6 hundreds, 4 tens and 7 ones squash together into 647.' },
      { q:'900 + 80 + 5', a:985, big:true, why:'Nine hundreds, eight tens and five ones: 985.' },
      { q:'200 + 50', a:250, big:true, why:'Two hundreds and five tens, with no ones: 250.' },
      { q:'300 + 8', a:308, big:true, why:'No tens, so a 0 holds the tens column open: 308.' },
      { q:'700 + 10 + 1', a:711, big:true, why:'Seven hundreds, one ten, one one: 711.' },
    ]},
    { n:5, name:'Comparing Numbers', ac:'AC9M3N01', teach:'Which is bigger, and how you can tell at a glance.', qs:[
      { q:'Which is biggest?', pick:['508','580','805'], a:2, hint:'Compare the hundreds first.', why:'805 has 8 hundreds. The other two have 5.' },
      { q:'Smallest first — which comes FIRST?', pick:['450','405','540'], a:1, why:'405 has only 0 tens, so it is the smallest of the three.' },
      { q:'Which is smallest?', pick:['307','370','730'], a:0, why:'307 has 3 hundreds and no tens.' },
      { q:'Which is bigger, 89 or 98?', pick:['89','98'], a:1, why:'98 has 9 tens, 89 has only 8.' },
      { q:'Which is biggest?', pick:['260','206','620'], a:2, why:'620 has 6 hundreds; the other two have 2.' },
    ]},
    { n:6, name:'Adding to 20', ac:'AC9M3N03', teach:'The small sums, learned by heart.', qs:[
      { q:'8 + 7', a:15, big:true, why:'8 + 2 = 10, then 5 more: 15.' },
      { q:'9 + 8', a:17, big:true, hint:'Make the 9 up to 10 first.', why:'9 + 1 = 10, then 7 more: 17.' },
      { q:'13 + 5', a:18, big:true, why:'13 + 5 = 18.' },
      { q:'7 + 7', a:14, big:true, why:'Double 7 is 14.' },
      { q:'12 + 9', a:21, big:true, why:'12 + 10 = 22, then give one back: 21.' },
    ]},
    { n:7, name:'Adding to 100', ac:'AC9M3N03', teach:'Two-digit adding where nothing has to be carried.', qs:[
      { q:'34 + 25', a:59, big:true, why:'4 + 5 = 9 ones, 3 + 2 = 5 tens. Nothing to carry: 59.' },
      { q:'60 + 19', a:79, big:true, why:'The tens go 6 + 1, the ones stay at 9: 79.' },
      { q:'40 + ? = 60', a:20, why:'40 needs 20 more to reach 60, because 4 tens plus 2 tens is 6 tens.' },
      { q:'Greta has 29 stickers and gets 10 more. How many now?', a:39, why:'Adding ten only changes the tens digit: 29 + 10 = 39.' },
      { q:'75 + 25', a:100, big:true, why:'75 + 25 = 100. Quarters of a hundred are worth learning by heart.' },
    ]},
    { n:8, name:'Adding with Carrying', ac:'AC9M3N03', teach:'When the ones column gets too full.', qs:[
      { q:'47 + 38', a:85, big:true, hint:'The ones make 15 — that is 1 ten and 5 ones.', why:'7 + 8 = 15, so write 5 and carry 1. 4 + 3 + 1 = 8 tens. Answer 85.' },
      { q:'56 + 27', a:83, big:true, why:'6 + 7 = 13, write 3 carry 1. 5 + 2 + 1 = 8. Answer 83.' },
      { q:'28 + 14', a:42, big:true, why:'8 + 4 = 12, write 2 carry 1. 2 + 1 + 1 = 4. Answer 42.' },
      { q:'65 + 19', a:84, big:true, hint:'19 is one less than 20.', why:'65 + 20 = 85, then give one back: 84.' },
      { q:'38 + 38', a:76, big:true, why:'Double 38. 8 + 8 = 16, write 6 carry 1. 3 + 3 + 1 = 7. Answer 76.' },
    ]},
    { n:9, name:'Subtracting to 20', ac:'AC9M3N03', teach:'The small take-aways, learned by heart.', qs:[
      { q:'15 − 7', a:8, big:true, why:'15 − 5 = 10, then 2 more: 8.' },
      { q:'18 − 9', a:9, big:true, why:'18 is double 9, so taking one 9 away leaves the other.' },
      { q:'20 − 4', a:16, big:true, why:'20 − 4 = 16.' },
      { q:'13 − 6', a:7, big:true, why:'13 − 3 = 10, then 3 more: 7.' },
      { q:'11 − 11', a:0, big:true, why:'Take a number away from itself and nothing is left.' },
    ]},
    { n:10, name:'Subtracting to 100', ac:'AC9M3N03', teach:'Two-digit take-aways where nothing has to be borrowed.', qs:[
      { q:'58 − 23', a:35, big:true, why:'8 − 3 = 5 ones, 5 − 2 = 3 tens. Answer 35.' },
      { q:'80 − ? = 60', a:20, why:'80 − 60 = 20, so 20 is the number taken away.' },
      { q:'A milbil had 52 marbles and lost 20. How many are left?', a:32, why:'Taking away twenty only changes the tens: 52 − 20 = 32.' },
      { q:'100 − 60', a:40, big:true, why:'Ten tens take away six tens leaves four tens: 40.' },
      { q:'45 − 45', a:0, big:true, why:'Take a number away from itself and nothing is left: 0.' },
    ]},
    { n:11, name:'Subtracting with Borrowing', ac:'AC9M3N03', teach:'When the ones column runs out.', qs:[
      { q:'71 − 46', a:25, big:true, hint:'You cannot do 1 − 6, so borrow a ten.', why:'Borrow: 11 − 6 = 5, then 6 − 4 = 2. Answer 25.' },
      { q:'90 − 37', a:53, big:true, hint:'Borrow a ten from the 9.', why:'Borrow: 10 − 7 = 3, then 8 − 3 = 5. Answer 53.' },
      { q:'62 − 28', a:34, big:true, why:'Borrow: 12 − 8 = 4, then 5 − 2 = 3. Answer 34.' },
      { q:'50 − 17', a:33, big:true, why:'Borrow: 10 − 7 = 3, then 4 − 1 = 3. Answer 33.' },
      { q:'83 − 45', a:38, big:true, why:'Borrow: 13 − 5 = 8, then 7 − 4 = 3. Answer 38.' },
    ]},
    { n:12, name:'Three-Digit Adding', ac:'AC9M3N04', teach:'The same columns, one column wider.', qs:[
      { q:'234 + 152', a:386, big:true, why:'4 + 2 = 6, 3 + 5 = 8, 2 + 1 = 3. Answer 386.' },
      { q:'340 + 250', a:590, big:true, why:'No ones at all, 4 tens + 5 tens = 9 tens, 3 + 2 = 5 hundreds. Answer 590.' },
      { q:'367 + 128', a:495, big:true, hint:'7 + 8 goes over ten, so carry one into the tens.', why:'7 + 8 = 15, write 5 carry 1. 6 + 2 + 1 = 9. 3 + 1 = 4. Answer 495.' },
      { q:'250 + 250', a:500, big:true, why:'Two lots of 250 make 500.' },
      { q:'405 + 130', a:535, big:true, why:'5 + 0 = 5, 0 + 3 = 3, 4 + 1 = 5. Answer 535.' },
    ]},
    { n:13, name:'Three-Digit Subtracting', ac:'AC9M3N04', teach:'Taking away hundreds, tens and ones.', qs:[
      { q:'486 − 253', a:233, big:true, why:'6 − 3 = 3, 8 − 5 = 3, 4 − 2 = 2. Answer 233.' },
      { q:'600 − 250', a:350, big:true, hint:'Count in hundreds and fifties.', why:'600 − 200 = 400, then − 50 = 350.' },
      { q:'A school has 458 pupils. 126 are away. How many are at school?', a:332, why:'458 − 126 = 332, taking each column away in turn.' },
      { q:'384 − 156', a:228, big:true, hint:'You cannot do 4 − 6, so borrow a ten.', why:'14 − 6 = 8, 7 − 5 = 2, 3 − 1 = 2. Answer 228.' },
      { q:'750 − 300', a:450, big:true, why:'Seven hundreds take three hundreds leaves four, and the 50 stays: 450.' },
    ]},
    { n:14, name:'Number Patterns', ac:'AC9M3A01', teach:'Skip counting forwards and backwards.', qs:[
      { q:'Count by 2s: 12, 14, 16, ?', a:18, why:'Each step adds 2, so 16 + 2 = 18.' },
      { q:'Count by 5s: 35, 40, 45, ?', a:50, why:'45 + 5 = 50. Counting by 5s always ends in 0 or 5.' },
      { q:'Count by 10s: 170, 180, 190, ?', a:200, why:'190 + 10 = 200 — the hundreds column ticks over.' },
      { q:'Count by 3s: 12, 15, 18, ?', a:21, why:'18 + 3 = 21.' },
      { q:'Count BACK by 4s: 40, 36, 32, ?', a:28, why:'Each step takes 4 away: 32 − 4 = 28.' },
      { q:'Count by 25s: 25, 50, 75, ?', a:100, why:'Four 25s make 100 — the same as four 25c coins making a dollar.' },
    ]},
    { n:15, name:'Rounding to the Nearest 10', ac:'AC9M3N06', teach:'Which ten is nearer, and what to do with a half.', qs:[
      { q:'Round 47 to the nearest 10', a:50, hint:'Is 47 nearer 40 or 50?', why:'47 is only 3 away from 50 but 7 away from 40, so it rounds up.' },
      { q:'Round 62 to the nearest 10', a:60, why:'The ones digit is 2, which is small, so round down to 60.' },
      { q:'Round 85 to the nearest 10', a:90, why:'85 is exactly halfway, and a half always rounds up: 90.' },
      { q:'Round 31 to the nearest 10', a:30, why:'The ones digit is 1, so round down to 30.' },
      { q:'Round 76 to the nearest 10', a:80, why:'The ones digit is 6, so round up to 80.' },
    ]},
    { n:16, name:'Rounding to the Nearest 100', ac:'AC9M3N06', teach:'The same rule, one column to the left.', qs:[
      { q:'Round 238 to the nearest 100', a:200, hint:'Look at the tens digit, not the ones.', why:'The tens digit is 3, so round down to 200.' },
      { q:'Round 371 to the nearest 100', a:400, why:'The tens digit is 7, so round up to 400.' },
      { q:'Round 520 to the nearest 100', a:500, why:'The tens digit is 2, which is small, so round down to 500.' },
      { q:'Round 149 to the nearest 100', a:100, why:'The tens digit is 4, so it rounds down to 100.' },
      { q:'Round 250 to the nearest 100', a:300, why:'250 is exactly halfway between 200 and 300, and a half rounds up.' },
    ]},
    { n:17, name:'Coins and Notes', ac:'AC9M3N05', teach:'What Australian money is made of.', qs:[
      { q:'How many 50c coins make $2?', a:4, why:'Two 50c coins make $1, so four make $2.' },
      { q:'How many 20c coins make $1?', a:5, why:'5 × 20c = 100c = $1.' },
      { q:'How many 10c coins make $1?', a:10, why:'$1 is 100 cents, and 100 ÷ 10 = 10.' },
      { q:'Which is the biggest Australian note?', pick:['$50','$100','$20'], a:1, why:'The $100 note is the biggest — it is the green one.' },
      { q:'How many 50c coins make $4?', a:8, why:'Two to the dollar, so eight make $4.' },
    ]},
    { n:18, name:'Money: Adding and Change', ac:'AC9M3N05', teach:'Dollars with a dot in them, and counting up for change.', qs:[
      { q:'$3.50 + $1.20 = ?', a:4.7, money:true, why:'$3.50 + $1.20 = $4.70. Add the dollars, then the cents.' },
      { q:'You pay $5 for a $3.50 book. How much change?', a:1.5, money:true, hint:'Count up from $3.50 to $5.', why:'$3.50 + 50c = $4, + $1 = $5. The change is $1.50.' },
      { q:'Two drinks cost $1.50 each. How much for both?', a:3, money:true, why:'$1.50 + $1.50 = $3.00.' },
      { q:'A milbil has $10 and spends $6.50. How much change?', a:3.5, money:true, why:'$6.50 + 50c = $7, + $3 = $10. The change is $3.50.' },
      { q:'$2.25 + $1.75 = ?', a:4, money:true, why:'The cents make a whole dollar: 25c + 75c = $1, so $2 + $1 + $1 = $4.00.' },
    ]},
    { n:19, name:'Odd, Even, Doubles and Halves', ac:'AC9M3N01', teach:'Numbers that split in two, and numbers that do not.', qs:[
      { q:'Is 36 odd or even?', pick:['Odd','Even'], a:1, why:'36 ends in 6, so it is even — it splits into two halves of 18.' },
      { q:'Is 471 odd or even?', pick:['Odd','Even'], a:0, why:'It ends in 1. Only the last digit matters, so 471 is odd.' },
      { q:'Double 17', a:34, big:true, why:'17 + 17 = 34.' },
      { q:'Half of 48', a:24, big:true, why:'48 splits into 24 and 24.' },
      { q:'Double 45', a:90, big:true, why:'45 + 45 = 90.' },
      { q:'Half of 140', a:70, big:true, why:'Half of 14 tens is 7 tens: 70.' },
    ]},
    { n:20, name:'Stage 1 Check-up', ac:'Stage 1 review', checkup:true, teach:'Eight questions from everything in Stage 1.', qs:[
      { q:'In 905, what is the 9 worth?', pick:['9','90','900'], a:2, why:'Hundreds column: 900.' },
      { q:'268 + 131', a:399, big:true, why:'8 + 1 = 9, 6 + 3 = 9, 2 + 1 = 3. Nothing to carry: 399.' },
      { q:'680 − 250', a:430, big:true, why:'8 tens take 5 tens is 3 tens, 6 hundreds take 2 is 4. Answer 430.' },
      { q:'Round 149 to the nearest 100', a:100, why:'The tens digit is 4, so it rounds down to 100.' },
      { q:'Count by 5s: 80, 85, 90, ?', a:95, why:'90 + 5 = 95.' },
      { q:'Double 36', a:72, big:true, why:'36 + 36 = 72.' },
      { q:'Which is smallest?', pick:['307','370','730'], a:0, why:'307 has 3 hundreds and no tens.' },
      { q:'How many 20c coins make $2?', a:10, why:'$2 is 200 cents, and 200 ÷ 20 = 10.' },
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
  blurb: 'Times tables one at a time, dividing things up fairly, and what a fraction really means.',

  lessons: [
    { n:1, name:'Groups and Lots-Of', ac:'AC9M4N06', teach:'What multiplying actually means before any table is learned.', qs:[
      { q:'3 groups of 4. How many altogether?', a:12, why:'4 + 4 + 4 = 12, which is what 3 × 4 means.' },
      { q:'5 groups of 2. How many altogether?', a:10, why:'Five twos: 10.' },
      { q:'4 lots of 5. How many altogether?', a:20, why:'5 + 5 + 5 + 5 = 20.' },
      { q:'2 groups of 7. How many altogether?', a:14, why:'7 + 7 = 14.' },
      { q:'6 groups of 3. How many altogether?', a:18, why:'Six threes: 18.' },
    ]},
    { n:2, name:'The 2 Times Table', ac:'AC9M4N06', teach:'Multiplying by two is just doubling.', qs:[
      { q:'6 × 2', a:12, big:true, why:'Double 6 is 12.' },
      { q:'8 × 2', a:16, big:true, why:'Double 8 is 16.' },
      { q:'9 × 2', a:18, big:true, why:'Double 9 is 18.' },
      { q:'12 × 2', a:24, big:true, why:'Double 12 is 24.' },
      { q:'5 bags with 2 apples in each. How many apples?', a:10, why:'5 × 2 = 10.' },
    ]},
    { n:3, name:'The 5 and 10 Times Tables', ac:'AC9M4N06', teach:'Two tables for the price of one — fives are half of tens.', qs:[
      { q:'7 × 10', a:70, big:true, why:'Multiplying by 10 adds a zero: 70.' },
      { q:'9 × 5', a:45, big:true, hint:'Work out 9 × 10, then halve it.', why:'9 × 10 = 90, and half of 90 is 45.' },
      { q:'12 × 5', a:60, big:true, why:'Half of 12 × 10 = 120, so 60.' },
      { q:'11 × 10', a:110, big:true, why:'11 with a zero on the end: 110.' },
      { q:'6 × 5', a:30, big:true, why:'Half of 60 is 30.' },
    ]},
    { n:4, name:'The 3 Times Table', ac:'AC9M4N06', teach:'Threes, which turn up everywhere.', qs:[
      { q:'7 × 3', a:21, big:true, why:'Three sevens: 7 + 7 + 7 = 21.' },
      { q:'9 × 3', a:27, big:true, why:'Nine threes: 27.' },
      { q:'4 × 3', a:12, big:true, why:'Four threes: 12.' },
      { q:'12 × 3', a:36, big:true, why:'10 × 3 = 30 and 2 × 3 = 6. Together, 36.' },
      { q:'6 × 3', a:18, big:true, why:'Six threes: 18.' },
    ]},
    { n:5, name:'The 4 Times Table', ac:'AC9M4N06', teach:'Fours are doubling, then doubling again.', qs:[
      { q:'6 × 4', a:24, big:true, hint:'Double 6, then double your answer.', why:'6 → 12 → 24.' },
      { q:'7 × 4', a:28, big:true, why:'7 → 14 → 28.' },
      { q:'9 × 4', a:36, big:true, why:'9 → 18 → 36.' },
      { q:'12 × 4', a:48, big:true, why:'12 → 24 → 48.' },
      { q:'8 × 4', a:32, big:true, why:'8 → 16 → 32.' },
    ]},
    { n:6, name:'The 6 Times Table', ac:'AC9M4N06', teach:'Sixes are double the threes.', qs:[
      { q:'8 × 6', a:48, big:true, why:'8 × 3 = 24, doubled is 48.' },
      { q:'6 × 6', a:36, big:true, why:'Six sixes: 36. A square number.' },
      { q:'7 × 6', a:42, big:true, why:'7 × 3 = 21, doubled is 42.' },
      { q:'9 × 6', a:54, big:true, hint:'Ten sixes, take one six off.', why:'60 − 6 = 54.' },
      { q:'4 milbils each have 6 pencils. How many pencils?', a:24, why:'4 × 6 = 24.' },
    ]},
    { n:7, name:'The 7 Times Table', ac:'AC9M4N06', teach:'The one nobody finds easy. Worth the effort.', qs:[
      { q:'7 × 7', a:49, big:true, why:'Seven sevens: 49.' },
      { q:'7 × 8', a:56, big:true, hint:'5, 6, 7, 8 — the answer comes in order.', why:'7 × 8 = 56.' },
      { q:'7 × 9', a:63, big:true, why:'70 − 7 = 63.' },
      { q:'7 × 12', a:84, big:true, why:'7 × 10 = 70 and 7 × 2 = 14. Together, 84.' },
      { q:'7 × 11', a:77, big:true, why:'Elevens repeat the digit: 77.' },
    ]},
    { n:8, name:'The 8 Times Table', ac:'AC9M4N06', teach:'Eights are doubling three times over.', qs:[
      { q:'8 × 8', a:64, big:true, why:'Eight eights: 64.' },
      { q:'9 × 8', a:72, big:true, hint:'Ten eights, take one eight off.', why:'80 − 8 = 72.' },
      { q:'12 × 8', a:96, big:true, why:'10 × 8 = 80 and 2 × 8 = 16. Together, 96.' },
      { q:'8 × 5', a:40, big:true, why:'Half of 8 × 10 = 80, so 40.' },
      { q:'8 × 11', a:88, big:true, why:'Elevens repeat the digit: 88.' },
    ]},
    { n:9, name:'The 9 Times Table', ac:'AC9M4N06', teach:'Every nine is a ten with one lot taken off.', qs:[
      { q:'9 × 9', a:81, big:true, hint:'Ten nines is 90. Take one nine off.', why:'90 − 9 = 81.' },
      { q:'9 × 6', a:54, big:true, why:'60 − 6 = 54.' },
      { q:'9 × 7', a:63, big:true, why:'70 − 7 = 63.' },
      { q:'9 × 12', a:108, big:true, why:'120 − 12 = 108.' },
      { q:'9 × 3', a:27, big:true, why:'30 − 3 = 27.' },
    ]},
    { n:10, name:'The 11 and 12 Times Tables', ac:'AC9M4N06', teach:'The last two, and the trick for each.', qs:[
      { q:'11 × 4', a:44, big:true, why:'Up to 9, elevens just repeat the digit: 44.' },
      { q:'11 × 7', a:77, big:true, why:'77.' },
      { q:'12 × 6', a:72, big:true, hint:'Ten sixes plus two sixes.', why:'60 + 12 = 72.' },
      { q:'12 × 9', a:108, big:true, why:'90 + 18 = 108.' },
      { q:'12 × 12', a:144, big:true, why:'A dozen dozen: 144.' },
    ]},
    { n:11, name:'Dividing by Sharing', ac:'AC9M4N06', teach:'Dividing is handing things out fairly.', qs:[
      { q:'Share 36 lollies between 4 milbils. How many each?', a:9, why:'36 ÷ 4 = 9, because 9 × 4 = 36.' },
      { q:'24 ÷ 4', a:6, big:true, why:'6 × 4 = 24.' },
      { q:'35 ÷ 5', a:7, big:true, why:'7 × 5 = 35.' },
      { q:'100 ÷ 10', a:10, big:true, why:'Ten tens make 100.' },
      { q:'6 milbils share 42 stickers equally. How many each?', a:7, why:'42 ÷ 6 = 7.' },
    ]},
    { n:12, name:'Dividing with the Tables', ac:'AC9M4N06', teach:'Every division is a times table read backwards.', qs:[
      { q:'48 ÷ 6', a:8, big:true, hint:'What times 6 makes 48?', why:'8 × 6 = 48.' },
      { q:'63 ÷ 9', a:7, big:true, why:'7 × 9 = 63.' },
      { q:'72 ÷ 8', a:9, big:true, why:'9 × 8 = 72.' },
      { q:'96 ÷ 8', a:12, big:true, why:'12 × 8 = 96.' },
      { q:'110 ÷ 10', a:11, big:true, why:'11 × 10 = 110.' },
    ]},
    { n:13, name:'Remainders', ac:'AC9M4N07', teach:'What is left over when it will not share evenly.', qs:[
      { q:'13 ÷ 4 — what is the remainder?', a:1, hint:'The biggest 4 that fits in 13 is 12.', why:'3 × 4 = 12, and 13 − 12 = 1 left over.' },
      { q:'29 ÷ 5 — what is the remainder?', a:4, why:'5 × 5 = 25, and 29 − 25 = 4.' },
      { q:'17 ÷ 3 — what is the remainder?', a:2, why:'5 × 3 = 15, and 17 − 15 = 2.' },
      { q:'45 ÷ 6 — what is the remainder?', a:3, why:'7 × 6 = 42, and 45 − 42 = 3.' },
      { q:'7 milbils share 30 grapes. How many are left over?', a:2, why:'4 each uses 28, so 2 are left on the plate.' },
    ]},
    { n:14, name:'Factors', ac:'AC9M4N02', teach:'The numbers that divide into something exactly.', qs:[
      { q:'Which of these is a factor of 20?', pick:['3','6','5'], a:2, why:'5 divides into 20 exactly, 4 times. 3 and 6 do not.' },
      { q:'What is the biggest factor of 18 that is smaller than 18?', a:9, why:'18 = 2 × 9, so 9 is the biggest factor below 18 itself.' },
      { q:'How many factors does 10 have?', a:4, hint:'List them: which numbers divide into 10 exactly?', why:'1, 2, 5 and 10 — four factors.' },
      { q:'Is 7 a factor of 56?', pick:['Yes','No'], a:0, why:'Yes — 7 × 8 = 56.' },
      { q:'How many factors does 24 have?', a:8, why:'1, 2, 3, 4, 6, 8, 12 and 24 — eight of them.' },
    ]},
    { n:15, name:'Multiples', ac:'AC9M4N02', teach:'Everything in a number’s times table.', qs:[
      { q:'Is 24 a multiple of 6?', pick:['Yes','No'], a:0, why:'Yes — 6 × 4 = 24, so 24 is in the six times table.' },
      { q:'Which is a multiple of 7?', pick:['27','42','52'], a:1, why:'6 × 7 = 42.' },
      { q:'Which is a multiple of 8?', pick:['36','44','56'], a:2, why:'7 × 8 = 56.' },
      { q:'What is the smallest number that is a multiple of BOTH 3 and 4?', a:12, hint:'Count through both tables until they meet.', why:'3, 6, 9, **12** … and 4, 8, **12** … They first meet at 12.' },
      { q:'What is the smallest number that is a multiple of BOTH 2 and 5?', a:10, why:'2, 4, 6, 8, **10** … and 5, **10** … They meet at 10.' },
    ]},
    { n:16, name:'Fractions of a Shape', ac:'AC9M4N03', teach:'Equal pieces, and how to name them.', qs:[
      { q:'A pizza is cut into 8 equal slices. You eat 1. What fraction did you eat?', pick:['1/4','1/8','8/1'], a:1, why:'One piece out of eight equal pieces is 1/8.' },
      { q:'A bar is cut into 4 equal parts and 3 are shaded. What fraction is shaded?', pick:['3/4','1/3','4/3'], a:0, why:'3 shaded out of 4 parts: 3/4.' },
      { q:'How many quarters make a whole?', a:4, why:'Four quarters make one whole.' },
      { q:'How many fifths make a whole?', a:5, why:'Five fifths — the bottom number always tells you.' },
      { q:'Which is bigger, 1/2 or 1/4?', pick:['1/2','1/4'], a:0, why:'Halves are bigger pieces, because fewer are sharing.' },
    ]},
    { n:17, name:'Fractions of a Number', ac:'AC9M4N03', teach:'Divide by the bottom, multiply by the top.', qs:[
      { q:'1/2 of 18', a:9, big:true, why:'18 ÷ 2 = 9.' },
      { q:'1/4 of 20', a:5, big:true, why:'20 ÷ 4 = 5.' },
      { q:'3/4 of 20', a:15, big:true, hint:'Find 1/4 first, then take three of them.', why:'20 ÷ 4 = 5, and 5 × 3 = 15.' },
      { q:'2/5 of 30', a:12, big:true, why:'30 ÷ 5 = 6, and 6 × 2 = 12.' },
      { q:'2/3 of 24', a:16, big:true, why:'24 ÷ 3 = 8, and 8 × 2 = 16.' },
    ]},
    { n:18, name:'Equivalent Fractions', ac:'AC9M4N04', teach:'Different names for exactly the same amount.', qs:[
      { q:'1/2 = ?/4', a:2, why:'The bottom doubled, so the top doubles too: 2/4.' },
      { q:'1/3 = ?/9', a:3, why:'The bottom was multiplied by 3, so the top is too: 3/9.' },
      { q:'2/5 = ?/10', a:4, why:'The bottom doubled, so 2 doubles to 4: 4/10.' },
      { q:'3/4 = ?/8', a:6, why:'The bottom doubled, so 3 doubles to 6: 6/8.' },
      { q:'Simplify 6/9', pick:['2/3','3/6','1/3'], a:0, why:'Both divide by 3: 6/9 = 2/3.' },
    ]},
    { n:19, name:'Comparing Fractions', ac:'AC9M4N04', teach:'Which slice is actually bigger.', qs:[
      { q:'Which is bigger, 2/3 or 1/3?', pick:['2/3','1/3'], a:0, why:'Same size pieces, but two of them instead of one.' },
      { q:'Which is the same as 1/2?', pick:['3/5','5/10','2/5'], a:1, why:'5 is half of 10, so 5/10 is one half.' },
      { q:'Which is bigger, 3/4 or 2/3?', pick:['3/4','2/3'], a:0, hint:'Make them both twelfths.', why:'3/4 is 9/12 and 2/3 is 8/12, so 3/4 wins.' },
      { q:'Simplify 4/8', pick:['1/2','2/4','1/4'], a:0, why:'Both divide by 4: 1/2. (2/4 is equal but not simplest.)' },
      { q:'Which is smallest?', pick:['1/2','1/8','1/4'], a:1, why:'The bigger the bottom number, the smaller the piece.' },
    ]},
    { n:20, name:'Stage 2 Check-up', ac:'Stage 2 review', checkup:true, teach:'Eight questions from everything in Stage 2.', qs:[
      { q:'8 × 7', a:56, big:true, why:'56 — the same as 7 × 8.' },
      { q:'54 ÷ 6', a:9, big:true, why:'9 × 6 = 54.' },
      { q:'23 ÷ 4 — what is the remainder?', a:3, why:'5 × 4 = 20, and 23 − 20 = 3.' },
      { q:'3/4 of 16', a:12, big:true, why:'16 ÷ 4 = 4, and 4 × 3 = 12.' },
      { q:'Which is a factor of 30?', pick:['4','7','6'], a:2, why:'6 × 5 = 30, so 6 is a factor.' },
      { q:'1/2 = ?/6', a:3, why:'3 is half of 6, so 3/6 = 1/2.' },
      { q:'6 milbils share 42 stickers equally. How many each?', a:7, why:'42 ÷ 6 = 7.' },
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
    { n:1, name:'Tenths', ac:'AC9M5N01', teach:'The first column after the dot.', qs:[
      { q:'What is 0.1 as a fraction?', pick:['1/10','1/100','10/1'], a:0, why:'The first column after the dot is tenths, so 0.1 = 1/10.' },
      { q:'Write 7/10 as a decimal', a:0.7, why:'Seven tenths goes straight into the tenths column: 0.7.' },
      { q:'Write 3/10 as a decimal', a:0.3, why:'Three tenths: 0.3.' },
      { q:'In 2.6, what is the 6 worth?', pick:['6 tenths','6 hundredths','6 ones'], a:0, why:'The first column after the dot is tenths.' },
      { q:'What is 5/10 the same as?', pick:['0.5','0.05','5.0'], a:0, why:'Five tenths is a half, written 0.5.' },
    ]},
    { n:2, name:'Hundredths', ac:'AC9M5N01', teach:'The second column after the dot, ten times smaller again.', qs:[
      { q:'In 3.47, what is the 7 worth?', pick:['7 tenths','7 hundredths','7 ones'], a:1, why:'The second column after the dot is hundredths.' },
      { q:'Write 3/100 as a decimal', a:0.03, hint:'You need the hundredths column, so the tenths column needs a 0.', why:'Three hundredths is 0.03.' },
      { q:'Write 0.25 as a fraction', pick:['1/4','1/25','2/5'], a:0, why:'0.25 is 25 hundredths, and 25/100 simplifies to 1/4.' },
      { q:'Write 0.75 as a fraction', pick:['3/4','7/5','3/5'], a:0, why:'75/100 simplifies to 3/4.' },
      { q:'Write 9/100 as a decimal', a:0.09, why:'Nine hundredths, with a 0 holding the tenths open: 0.09.' },
    ]},
    { n:3, name:'Comparing Decimals', ac:'AC9M5N01', teach:'Longer is not bigger. Line up the dots.', qs:[
      { q:'Which is bigger?', pick:['0.5','0.45'], a:0, hint:'Write 0.5 as 0.50 and compare.', why:'0.50 against 0.45 — five tenths beats four tenths.' },
      { q:'Which is smallest?', pick:['0.09','0.9','0.19'], a:0, why:'0.09 has 0 tenths. The other two have 9 and 1.' },
      { q:'Which is bigger?', pick:['0.6','0.60','They are the same'], a:2, why:'A nought on the end of a decimal changes nothing: 0.6 and 0.60 are the same number.' },
      { q:'Which is biggest?', pick:['1.2','1.09','1.15'], a:0, why:'Two tenths beats zero tenths and one tenth.' },
      { q:'Which is smallest?', pick:['0.3','0.03','0.33'], a:1, why:'0.03 has no tenths at all.' },
    ]},
    { n:4, name:'Adding Decimals', ac:'AC9M5N05', teach:'Line up the dots, then add as normal.', qs:[
      { q:'0.4 + 0.3', a:0.7, big:true, why:'Four tenths plus three tenths is seven tenths.' },
      { q:'1.5 + 2.7', a:4.2, big:true, why:'0.5 + 0.7 = 1.2, so carry the 1: 1 + 2 + 1 = 4. Answer 4.2.' },
      { q:'3.25 + 1.5', a:4.75, big:true, hint:'Write 1.5 as 1.50 so the columns line up.', why:'3.25 + 1.50 = 4.75.' },
      { q:'0.8 + 0.8', a:1.6, big:true, why:'Eight tenths twice is sixteen tenths, which is 1.6.' },
      { q:'2.5 + 1.75', a:4.25, big:true, why:'Write 2.5 as 2.50: 2.50 + 1.75 = 4.25.' },
    ]},
    { n:5, name:'Subtracting Decimals', ac:'AC9M5N05', teach:'The same trick, taking away.', qs:[
      { q:'5.0 − 1.6', a:3.4, big:true, why:'5 − 1.6 = 3.4. Check: 3.4 + 1.6 = 5.' },
      { q:'10 − 2.35', a:7.65, big:true, why:'10 − 2.35 = 7.65. Check: 7.65 + 2.35 = 10.' },
      { q:'6.4 − 2.9', a:3.5, big:true, hint:'Take 3 away, then give 0.1 back.', why:'6.4 − 3 = 3.4, + 0.1 = 3.5.' },
      { q:'100 − 0.5', a:99.5, big:true, why:'Half a unit below 100 is 99.5.' },
      { q:'4.75 − 1.25', a:3.5, big:true, why:'The hundredths cancel out: 4.75 − 1.25 = 3.50.' },
    ]},
    { n:6, name:'Multiplying by 10, 100 and 1000', ac:'AC9M5N04', teach:'Digits sliding left past the dot.', qs:[
      { q:'4.5 × 10', a:45, big:true, hint:'Every digit moves one column to the left.', why:'4.5 → 45.' },
      { q:'0.6 × 100', a:60, big:true, why:'Two columns left: 0.6 → 6 → 60.' },
      { q:'2.5 × 1000', a:2500, big:true, why:'Three columns left: 2.5 → 25 → 250 → 2500.' },
      { q:'0.07 × 100', a:7, big:true, why:'Two columns left: 0.07 → 0.7 → 7.' },
      { q:'6.4 × 10', a:64, big:true, why:'One column left: 64.' },
    ]},
    { n:7, name:'Dividing by 10, 100 and 1000', ac:'AC9M5N04', teach:'And the same digits sliding back the other way.', qs:[
      { q:'72 ÷ 10', a:7.2, big:true, hint:'Every digit moves one column to the right.', why:'72 → 7.2.' },
      { q:'350 ÷ 100', a:3.5, big:true, why:'Two columns right: 350 → 35 → 3.5.' },
      { q:'9 ÷ 1000', a:0.009, hint:'Three columns right. You will need zeros as place holders.', why:'9 → 0.9 → 0.09 → 0.009.' },
      { q:'6 ÷ 100', a:0.06, why:'Two columns right: 6 → 0.6 → 0.06.' },
      { q:'45 ÷ 10', a:4.5, big:true, why:'One column right: 4.5.' },
    ]},
    { n:8, name:'Simple Percentages', ac:'AC9M5N08', teach:'Per cent means out of a hundred.', qs:[
      { q:'50% of 60', a:30, big:true, hint:'50% is just a half.', why:'60 ÷ 2 = 30.' },
      { q:'10% of 80', a:8, big:true, why:'10% is a tenth: 80 ÷ 10 = 8.' },
      { q:'25% of 40', a:10, big:true, hint:'A quarter — halve it twice.', why:'40 → 20 → 10.' },
      { q:'100% of 17', a:17, big:true, why:'100% is all of it, so nothing changes.' },
      { q:'50% of 90', a:45, big:true, why:'Half of 90 is 45.' },
    ]},
    { n:9, name:'Percentages of an Amount', ac:'AC9M5N08', teach:'Building the awkward ones out of the easy ones.', qs:[
      { q:'20% of 50', a:10, big:true, hint:'Find 10% first, then double it.', why:'10% of 50 is 5, so 20% is 10.' },
      { q:'75% of 40', a:30, big:true, hint:'50% + 25%.', why:'Half is 20 and a quarter is 10, so 75% is 30.' },
      { q:'5% of 200', a:10, big:true, why:'10% of 200 is 20, so 5% is half of that: 10.' },
      { q:'30% of 70', a:21, big:true, why:'10% of 70 is 7, so 30% is 21.' },
      { q:'15% of 60', a:9, big:true, why:'10% is 6 and 5% is 3, so 15% is 9.' },
    ]},
    { n:10, name:'Fractions, Decimals and Percentages', ac:'AC9M5N08', teach:'The same amount in three different outfits.', qs:[
      { q:'1/2 as a percentage', a:50, unit:'%', why:'A half is 50 out of 100.' },
      { q:'0.25 as a percentage', a:25, unit:'%', why:'Multiply a decimal by 100: 0.25 → 25%.' },
      { q:'10% as a decimal', a:0.1, why:'Divide a percentage by 100: 10 → 0.1.' },
      { q:'3/4 as a percentage', a:75, unit:'%', why:'Three quarters of 100 is 75.' },
      { q:'Which is biggest?', pick:['0.6','55%','1/2'], a:0, hint:'Turn them all into percentages.', why:'0.6 is 60%, which beats 55% and 50%.' },
    ]},
    { n:11, name:'Length', ac:'AC9M5M01', teach:'Millimetres, centimetres, metres and kilometres.', qs:[
      { q:'How many centimetres in 3 metres?', a:300, unit:'cm', why:'100 cm in a metre, so 3 × 100 = 300 cm.' },
      { q:'How many millimetres in 7 cm?', a:70, unit:'mm', why:'10 mm in a centimetre, so 70 mm.' },
      { q:'How many metres in 2.4 km?', a:2400, unit:'m', why:'1000 m in a kilometre: 2.4 × 1000 = 2400 m.' },
      { q:'How many centimetres in 4.5 metres?', a:450, unit:'cm', why:'4.5 × 100 = 450 cm.' },
      { q:'How many millimetres in 2 cm?', a:20, unit:'mm', why:'2 × 10 = 20 mm.' },
    ]},
    { n:12, name:'Mass and Capacity', ac:'AC9M5M01', teach:'Grams, kilograms, millilitres and litres.', qs:[
      { q:'How many grams in 2 kg?', a:2000, unit:'g', hint:'Kilo means a thousand.', why:'2 × 1000 = 2000 g.' },
      { q:'How many millilitres in 1.5 L?', a:1500, unit:'mL', why:'1000 mL in a litre, so 1500 mL.' },
      { q:'Which is heavier?', pick:['900 g','1 kg'], a:1, why:'1 kg is 1000 g, which beats 900 g.' },
      { q:'250 mL + 750 mL = ? litres', a:1, unit:'L', why:'250 + 750 = 1000 mL, which is exactly 1 litre.' },
      { q:'How many mL in 2.5 L?', a:2500, unit:'mL', why:'2.5 × 1000 = 2500 mL.' },
    ]},
    { n:13, name:'Perimeter', ac:'AC9M5M02', teach:'The fence all the way round the edge.', qs:[
      { q:'A square has sides of 5 cm. What is its perimeter?', a:20, unit:'cm', why:'Four sides of 5: 5 × 4 = 20 cm.' },
      { q:'A rectangle is 8 m by 3 m. What is its perimeter?', a:22, unit:'m', hint:'Add one long and one short side, then double.', why:'8 + 3 = 11, doubled is 22 m.' },
      { q:'A square has a perimeter of 28 cm. How long is one side?', a:7, unit:'cm', why:'28 ÷ 4 = 7 cm.' },
      { q:'A rectangle is 6 cm by 4 cm. What is its perimeter?', a:20, unit:'cm', why:'6 + 4 + 6 + 4 = 20 cm.' },
      { q:'A square has a perimeter of 36 m. How long is one side?', a:9, unit:'m', why:'36 ÷ 4 = 9 m.' },
    ]},
    { n:14, name:'Area', ac:'AC9M5M02', teach:'The carpet that covers the inside.', qs:[
      { q:'A rectangle is 6 cm by 4 cm. What is its area?', a:24, unit:'cm²', hint:'Long times short.', why:'6 × 4 = 24 cm².' },
      { q:'A rectangle is 10 cm by 2 cm. What is its area?', a:20, unit:'cm²', why:'10 × 2 = 20 cm².' },
      { q:'A square has an area of 36 cm². How long is one side?', a:6, unit:'cm', why:'6 × 6 = 36, so each side is 6 cm.' },
      { q:'A rectangle is 12 cm by 7 cm. What is its area?', a:84, unit:'cm²', why:'12 × 7 = 84 cm².' },
      { q:'A rectangle has an area of 48 cm² and is 6 cm long. How wide is it?', a:8, unit:'cm', why:'48 ÷ 6 = 8 cm.' },
    ]},
    { n:15, name:'Angles', ac:'AC9M5SP01', teach:'Measuring corners in degrees.', qs:[
      { q:'How many degrees in a right angle?', a:90, unit:'°', why:'A right angle — the corner of a page — is 90°.' },
      { q:'How many degrees in a straight line?', a:180, unit:'°', why:'Two right angles side by side: 180°.' },
      { q:'How many degrees all the way round?', a:360, unit:'°', why:'A full turn is 360° — four right angles.' },
      { q:'An angle of 45° is…', pick:['Acute','Obtuse','Reflex'], a:0, why:'Anything under 90° is **acute** — a sharp little angle.' },
      { q:'An angle of 130° is…', pick:['Acute','Obtuse','Reflex'], a:1, why:'Between 90° and 180° is **obtuse** — a wide open angle.' },
    ]},
    { n:16, name:'Angles on a Line and in a Triangle', ac:'AC9M5SP01', teach:'Two facts that solve most angle questions.', qs:[
      { q:'Two angles sit on a straight line. One is 60°. What is the other?', a:120, unit:'°', hint:'They must add to 180°.', why:'180 − 60 = 120°.' },
      { q:'The three angles in a triangle add up to how many degrees?', a:180, unit:'°', why:'Always 180°, in every triangle there has ever been.' },
      { q:'Two angles sit on a straight line. One is 115°. What is the other?', a:65, unit:'°', why:'180 − 115 = 65°.' },
      { q:'A triangle has angles of 90° and 35°. What is the third?', a:55, unit:'°', why:'180 − 90 − 35 = 55°.' },
      { q:'Two angles sit on a straight line. One is 47°. What is the other?', a:133, unit:'°', why:'180 − 47 = 133°.' },
    ]},
    { n:17, name:'Telling the Time', ac:'AC9M5M03', teach:'Minutes, hours and how long things take.', qs:[
      { q:'How many minutes in 2 hours?', a:120, why:'60 minutes an hour, so 2 × 60 = 120.' },
      { q:'How many seconds in 5 minutes?', a:300, why:'60 seconds a minute: 5 × 60 = 300.' },
      { q:'From 10:40 am to 11:25 am, how many minutes?', a:45, hint:'Hop to 11:00 first.', why:'10:40 → 11:00 is 20 minutes, then 25 more: 45.' },
      { q:'How many hours in 3 days?', a:72, why:'24 hours a day: 3 × 24 = 72.' },
      { q:'How many minutes from 2:50 pm to 3:30 pm?', a:40, why:'10 minutes to 3:00, then 30 more: 40.' },
    ]},
    { n:18, name:'24-Hour Time and Timetables', ac:'AC9M5M03', teach:'Counting straight past twelve.', qs:[
      { q:'Write 3:45 pm in 24-hour time', pick:['15:45','03:45','13:45'], a:0, why:'Keep counting past 12: 3 pm is 15:00, so 15:45.' },
      { q:'Write 09:20 in am/pm time', pick:['9:20 am','9:20 pm'], a:0, why:'Anything before 12:00 is am — morning.' },
      { q:'A film starts at 6:15 pm and runs 90 minutes. When does it finish?', pick:['7:45 pm','7:15 pm','8:15 pm'], a:0, why:'90 minutes is 1 hour 30. 6:15 + 1 hour = 7:15, + 30 min = 7:45 pm.' },
      { q:'Write 8 pm in 24-hour time', pick:['20:00','18:00','08:00'], a:0, why:'12 + 8 = 20, so 20:00.' },
      { q:'A film starts at 7:40 pm and runs 95 minutes. When does it finish?', pick:['9:15 pm','9:05 pm','8:15 pm'], a:0, why:'95 minutes is 1 hour 35. 7:40 + 1 hour = 8:40, + 35 min = 9:15 pm.' },
    ]},
    { n:19, name:'Measuring Mixed Up', ac:'AC9M5M02', teach:'Everything from the measuring half of the stage, together.', qs:[
      { q:'A rectangle is 9 cm by 4 cm. What is its area?', a:36, unit:'cm²', why:'9 × 4 = 36 cm².' },
      { q:'A square has a perimeter of 36 m. What is its area?', a:81, unit:'m²', hint:'Find one side first.', why:'Each side is 36 ÷ 4 = 9 m, so the area is 9 × 9 = 81 m².' },
      { q:'How many grams in 3.5 kg?', a:3500, unit:'g', why:'3.5 × 1000 = 3500 g.' },
      { q:'A rectangle is 7 m by 5 m. What is its area?', a:35, unit:'m²', why:'7 × 5 = 35 m².' },
      { q:'How many cm in 1.2 m?', a:120, unit:'cm', why:'1.2 × 100 = 120 cm.' },
    ]},
    { n:20, name:'Stage 3 Check-up', ac:'Stage 3 review', checkup:true, teach:'Eight questions from everything in Stage 3.', qs:[
      { q:'2.5 + 1.75', a:4.25, big:true, why:'Write 2.5 as 2.50: 2.50 + 1.75 = 4.25.' },
      { q:'30% of 70', a:21, big:true, why:'10% of 70 is 7, so 30% is 21.' },
      { q:'6.4 × 10', a:64, big:true, why:'Everything slides one column left: 64.' },
      { q:'How many mL in 2.5 L?', a:2500, unit:'mL', why:'2.5 × 1000 = 2500 mL.' },
      { q:'A rectangle is 9 cm by 4 cm. What is its area?', a:36, unit:'cm²', why:'9 × 4 = 36 cm².' },
      { q:'Two angles sit on a straight line. One is 115°. What is the other?', a:65, unit:'°', why:'180 − 115 = 65°.' },
      { q:'Write 1/4 as a percentage', a:25, unit:'%', why:'A quarter of 100 is 25.' },
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
    { n:1, name:'Brackets First', ac:'AC9M6N07', teach:'Brackets mean do this bit first, no arguments.', qs:[
      { q:'(3 + 4) × 2', a:14, big:true, why:'Brackets first: 3 + 4 = 7, then 7 × 2 = 14.' },
      { q:'(8 + 4) ÷ 3', a:4, big:true, why:'Brackets first: 12 ÷ 3 = 4.' },
      { q:'5 × (6 − 2)', a:20, big:true, why:'Brackets first: 6 − 2 = 4, then 5 × 4 = 20.' },
      { q:'36 ÷ (3 × 3)', a:4, big:true, why:'Brackets first: 3 × 3 = 9, then 36 ÷ 9 = 4.' },
      { q:'(12 − 4) × (2 + 3)', a:40, big:true, hint:'Do both brackets before anything else.', why:'8 × 5 = 40.' },
    ]},
    { n:2, name:'Order of Operations', ac:'AC9M6N07', teach:'BIDMAS: the order everybody has agreed on.', qs:[
      { q:'3 + 4 × 2', a:11, big:true, hint:'Multiplying happens before adding.', why:'4 × 2 = 8 first, then 3 + 8 = 11.' },
      { q:'20 − 6 ÷ 2', a:17, big:true, why:'Divide first: 6 ÷ 2 = 3, then 20 − 3 = 17.' },
      { q:'10 + 2 × 5 − 3', a:17, big:true, why:'2 × 5 = 10 first, then 10 + 10 − 3 = 17.' },
      { q:'6 + 3 × 4', a:18, big:true, why:'Multiply first: 3 × 4 = 12, then 6 + 12 = 18.' },
      { q:'4 + 5 × 3 − 2', a:17, big:true, why:'5 × 3 = 15 first, then 4 + 15 − 2 = 17.' },
    ]},
    { n:3, name:'Negative Numbers', ac:'AC9M7N01', teach:'The numbers that live below zero.', qs:[
      { q:'What number is 3 steps below 0?', a:-3, why:'Counting down past zero: −1, −2, −3.' },
      { q:'Which is colder?', pick:['−5°C','−12°C'], a:1, why:'The further below zero, the colder.' },
      { q:'What number is 4 less than 1?', a:-3, why:'1 − 4 = −3. You go past zero by 3.' },
      { q:'Smallest first — which comes FIRST?', pick:['−2','−7','3'], a:1, why:'−7 is furthest below zero, so it is the smallest.' },
      { q:'Which is bigger, −1 or −9?', pick:['−1','−9'], a:0, why:'−1 is only just below zero, so it is the bigger of the two.' },
    ]},
    { n:4, name:'Adding and Subtracting Integers', ac:'AC9M7N06', teach:'Walking forwards and backwards along the number line.', qs:[
      { q:'−5 + 8', a:3, big:true, hint:'Start at −5 and walk 8 steps forwards.', why:'−5 + 5 = 0, then 3 more: 3.' },
      { q:'4 − 9', a:-5, big:true, why:'4 − 4 = 0, then 5 more backwards: −5.' },
      { q:'−3 − 4', a:-7, big:true, why:'Already below zero, going 4 further down: −7.' },
      { q:'7 − (−2)', a:9, big:true, hint:'Taking away a negative is the same as adding.', why:'Two minus signs cancel: 7 + 2 = 9.' },
      { q:'−6 + 2', a:-4, big:true, why:'Two steps up from −6 is −4.' },
    ]},
    { n:5, name:'Square Numbers', ac:'AC9M7N01', teach:'A number multiplied by itself.', qs:[
      { q:'5²', a:25, big:true, hint:'5 × 5.', why:'5 × 5 = 25.' },
      { q:'9²', a:81, big:true, why:'9 × 9 = 81.' },
      { q:'12²', a:144, big:true, why:'12 × 12 = 144.' },
      { q:'8²', a:64, big:true, why:'8 × 8 = 64.' },
      { q:'11²', a:121, big:true, why:'11 × 11 = 121.' },
    ]},
    { n:6, name:'Cubes and Powers', ac:'AC9M7N01', teach:'The little number counts how many you multiply.', qs:[
      { q:'2³', a:8, big:true, hint:'Three 2s multiplied together.', why:'2 × 2 × 2 = 8.' },
      { q:'3³', a:27, big:true, why:'3 × 3 × 3 = 27.' },
      { q:'10³', a:1000, big:true, why:'10 × 10 × 10 = 1000.' },
      { q:'2⁴', a:16, big:true, why:'2 × 2 × 2 × 2 = 16.' },
      { q:'4³', a:64, big:true, why:'4 × 4 × 4 = 64.' },
    ]},
    { n:7, name:'Square Roots', ac:'AC9M7N01', teach:'Squaring, read backwards.', qs:[
      { q:'The square root of 49', a:7, big:true, hint:'What times itself makes 49?', why:'7 × 7 = 49, so √49 = 7.' },
      { q:'The square root of 100', a:10, big:true, why:'10 × 10 = 100.' },
      { q:'The square root of 81', a:9, big:true, why:'9 × 9 = 81.' },
      { q:'The square root of 144', a:12, big:true, why:'12 × 12 = 144.' },
      { q:'The square root of 36', a:6, big:true, why:'6 × 6 = 36.' },
    ]},
    { n:8, name:'Letters for Numbers', ac:'AC9M7A01', teach:'A letter is just a number in a hat.', qs:[
      { q:'If n = 5, what is n + 7?', a:12, big:true, why:'Swap n for 5: 5 + 7 = 12.' },
      { q:'If a = 3, what is 4a?', a:12, big:true, hint:'4a means 4 × a.', why:'4 × 3 = 12.' },
      { q:'A milbil buys n cakes at $4 each. What does it cost?', pick:['4n','n + 4','n ÷ 4'], a:0, why:'n cakes at $4 each is 4 × n, written 4n.' },
      { q:'If n = 6, what is 2n?', a:12, big:true, why:'2 × 6 = 12.' },
      { q:'If y = 6, what is y²?', a:36, big:true, why:'6 × 6 = 36.' },
    ]},
    { n:9, name:'Substituting into Expressions', ac:'AC9M7A01', teach:'Two steps instead of one.', qs:[
      { q:'If x = 10, what is 2x − 4?', a:16, big:true, hint:'Work out 2x first.', why:'2 × 10 = 20, then 20 − 4 = 16.' },
      { q:'If n = 4, what is 3n − 5?', a:7, big:true, why:'3 × 4 = 12, then 12 − 5 = 7.' },
      { q:'If x = 7, what is 5x − 12?', a:23, big:true, why:'5 × 7 = 35, then 35 − 12 = 23.' },
      { q:'If a = 5, what is 2a + 3?', a:13, big:true, why:'2 × 5 = 10, then 10 + 3 = 13.' },
      { q:'If n = 3, what is 4n + n?', a:15, big:true, why:'4 × 3 = 12, plus another 3: 15.' },
    ]},
    { n:10, name:'Simplifying Expressions', ac:'AC9M7A01', teach:'Only matching letters can be added up.', qs:[
      { q:'Simplify 3n + 2n', pick:['5n','6n','5n²'], a:0, why:'Three ns plus two ns is five ns. You are counting, not multiplying.' },
      { q:'Simplify 7a − 3a', pick:['4a','10a','4'], a:0, why:'Seven as take away three as leaves four as: 4a.' },
      { q:'Simplify x + x + x', pick:['3x','x³','3'], a:0, why:'Three lots of x is 3x.' },
      { q:'Simplify 5b + b', pick:['6b','5b²','5'], a:0, why:'A lone b counts as 1b, so 5b + 1b = 6b.' },
      { q:'Simplify 8n − 8n', pick:['0','n','8n'], a:0, why:'Take something away from itself and nothing is left.' },
    ]},
    { n:11, name:'Solving One-Step Equations', ac:'AC9M7A02', teach:'Undo whatever was done to x.', qs:[
      { q:'x + 7 = 12. What is x?', a:5, big:true, hint:'Take 7 off both sides.', why:'12 − 7 = 5, so x = 5.' },
      { q:'x − 4 = 9. What is x?', a:13, big:true, why:'Add 4 to both sides: x = 13.' },
      { q:'3x = 21. What is x?', a:7, big:true, why:'Divide both sides by 3: x = 7.' },
      { q:'x ÷ 2 = 8. What is x?', a:16, big:true, why:'Multiply both sides by 2: x = 16.' },
      { q:'4x = 36. What is x?', a:9, big:true, why:'Divide both sides by 4: x = 9.' },
    ]},
    { n:12, name:'Solving Two-Step Equations', ac:'AC9M7A02', teach:'Undo the adding first, then the times.', qs:[
      { q:'2x + 1 = 11. What is x?', a:5, big:true, hint:'Undo the +1 first, then the ×2.', why:'11 − 1 = 10, then 10 ÷ 2 = 5.' },
      { q:'5x − 3 = 12. What is x?', a:3, big:true, why:'12 + 3 = 15, then 15 ÷ 5 = 3.' },
      { q:'4x + 3 = 31. What is x?', a:7, big:true, why:'31 − 3 = 28, then 28 ÷ 4 = 7.' },
      { q:'x ÷ 3 − 2 = 4. What is x?', a:18, big:true, why:'4 + 2 = 6, so x ÷ 3 = 6, so x = 18.' },
      { q:'x + x + x = 18. What is x?', a:6, big:true, why:'Three xs make 18, so each x is 18 ÷ 3 = 6.' },
    ]},
    { n:13, name:'Ratio', ac:'AC9M7N08', teach:'Counting in parts instead of in ones.', qs:[
      { q:'Mix cordial and water 1:4. For 2 cups of cordial, how many cups of water?', a:8, unit:'cups', why:'Four times as much water as cordial: 2 × 4 = 8.' },
      { q:'Mix paint 1:3. For 3 tins of red, how many tins of white?', a:9, unit:'tins', why:'Three times as much white: 3 × 3 = 9.' },
      { q:'A ratio of 2:5 has how many parts altogether?', a:7, hint:'Add the two numbers.', why:'2 + 5 = 7 parts.' },
      { q:'A ratio of 1:3 has how many parts altogether?', a:4, why:'1 + 3 = 4 parts.' },
      { q:'Mix squash 1:5. For 4 cups of squash, how many cups of water?', a:20, unit:'cups', why:'4 × 5 = 20.' },
    ]},
    { n:14, name:'Simplifying Ratios', ac:'AC9M7N08', teach:'A ratio tidies up just like a fraction.', qs:[
      { q:'Simplify the ratio 4:8', pick:['1:2','2:4','1:4'], a:0, why:'Both divide by 4: 1:2. (2:4 is equal but not simplest.)' },
      { q:'Simplify the ratio 10:15', pick:['2:3','1:5','5:10'], a:0, why:'Both divide by 5: 2:3.' },
      { q:'Simplify the ratio 6:9', pick:['2:3','3:2','1:3'], a:0, why:'Both divide by 3: 2:3.' },
      { q:'Simplify the ratio 12:4', pick:['3:1','1:3','6:2'], a:0, why:'Both divide by 4: 3:1.' },
      { q:'Simplify the ratio 20:30', pick:['2:3','1:2','4:6'], a:0, why:'Both divide by 10: 2:3.' },
    ]},
    { n:15, name:'Sharing in a Ratio', ac:'AC9M7N08', teach:'Add the parts first, always.', qs:[
      { q:'Share $20 between two milbils in the ratio 1:3. How much does the SECOND get?', a:15, money:true, hint:'1 + 3 = 4 parts. How big is one part?', why:'Each part is $5. The second gets 3 parts: $15.' },
      { q:'Share 24 lollies in the ratio 1:2. How many in the BIGGER share?', a:16, why:'1 + 2 = 3 parts of 8. The bigger share is 2 parts: 16.' },
      { q:'Share $45 in the ratio 2:3. How much is the BIGGER share?', a:27, money:true, why:'2 + 3 = 5 parts of $9. The bigger share is 3 parts: $27.' },
      { q:'Share 30 marbles in the ratio 1:4. How many in the SMALLER share?', a:6, why:'1 + 4 = 5 parts of 6. The smaller share is 1 part: 6.' },
      { q:'Share $60 in the ratio 1:2. How much is the SMALLER share?', a:20, money:true, why:'3 parts of $20. The smaller share is 1 part: $20.' },
    ]},
    { n:16, name:'Rate', ac:'AC9M7N08', teach:'A ratio where the two sides measure different things.', qs:[
      { q:'A car drives 120 km in 2 hours. What is its speed in km/h?', a:60, unit:'km/h', why:'120 ÷ 2 = 60 km every hour.' },
      { q:'3 pencils cost $6. How much do 5 cost?', a:10, money:true, hint:'Work out one pencil first.', why:'One pencil is $2, so 5 cost $10.' },
      { q:'A tap fills 40 litres in 5 minutes. How many litres a minute?', a:8, unit:'L/min', why:'40 ÷ 5 = 8 litres a minute.' },
      { q:'A milbil walks 12 km in 3 hours. How many km an hour?', a:4, unit:'km/h', why:'12 ÷ 3 = 4 km/h.' },
      { q:'4 cakes cost $12. How much do 7 cost?', a:21, money:true, why:'One cake is $3, so 7 cost $21.' },
    ]},
    { n:17, name:'Probability', ac:'AC9M7P01', teach:'The ones you want over all the ones there are.', qs:[
      { q:'You flip a fair coin. What is the chance of heads?', pick:['1/2','1/4','1'], a:0, why:'One wanted face out of two possible: 1/2.' },
      { q:'You roll a normal dice. What is the chance of a 3?', pick:['1/3','1/6','3/6'], a:1, why:'One face out of six: 1/6.' },
      { q:'A bag has 2 red and 3 blue marbles. What is the chance of red?', pick:['2/5','2/3','3/5'], a:0, why:'2 red out of 5 marbles altogether: 2/5.' },
      { q:'Write the chance of something CERTAIN as a number', a:1, why:'Certain is 1. Impossible is 0. Everything else sits between.' },
      { q:'What is the chance of rolling a 7 on a normal dice?', a:0, why:'There is no 7 on a dice, so it is impossible: 0.' },
    ]},
    { n:18, name:'Chance as Fractions and Percentages', ac:'AC9M7P01', teach:'The same chance, written three ways.', qs:[
      { q:'What is the chance of rolling an even number on a dice?', pick:['1/2','1/3','2/3'], a:0, why:'2, 4 and 6 — three faces out of six, which is 1/2.' },
      { q:'As a percentage, what is the chance of heads on a coin?', a:50, unit:'%', why:'1/2 is 50%.' },
      { q:'What is the chance of rolling a number BIGGER than 4 on a dice?', pick:['1/3','1/6','2/3'], a:0, why:'Only 5 and 6 work — 2 faces out of 6, which simplifies to 1/3.' },
      { q:'A bag has 4 red, 5 blue and 3 green marbles. What is the chance of blue?', pick:['5/12','5/7','1/3'], a:0, why:'5 blue out of 12 marbles altogether: 5/12.' },
      { q:'As a percentage, what is the chance of rolling an even number?', a:50, unit:'%', why:'1/2 is 50%.' },
    ]},
    { n:19, name:'Mean, Median, Mode and Range', ac:'AC9M7ST02', teach:'Four different ways to sum up a pile of numbers.', qs:[
      { q:'Find the MEAN of 3, 7, 7, 9, 14', a:8, hint:'Add them all up, then divide by how many there are.', why:'They add to 40, and 40 ÷ 5 = 8.' },
      { q:'Find the MEDIAN of 3, 7, 7, 9, 14', a:7, why:'Already in order — the middle one of five is the third: 7.' },
      { q:'Find the MODE of 3, 7, 7, 9, 14', a:7, why:'7 appears twice and everything else once.' },
      { q:'Find the RANGE of 3, 7, 7, 9, 14', a:11, why:'Biggest take away smallest: 14 − 3 = 11.' },
      { q:'Find the MEAN of 4, 6, 8, 10', a:7, why:'They add to 28, and 28 ÷ 4 = 7.' },
      { q:'Find the RANGE of 12, 3, 20, 8', a:17, why:'20 − 3 = 17.' },
    ]},
    { n:20, name:'Stage 4 Check-up', ac:'Stage 4 review', checkup:true, teach:'Eight questions from everything in Stage 4 — the last lesson in MilMATHS.', qs:[
      { q:'6 + 3 × 4', a:18, big:true, why:'Multiply first: 3 × 4 = 12, then 6 + 12 = 18.' },
      { q:'−7 + 12', a:5, big:true, why:'Seven steps up gets you to 0, then 5 more: 5.' },
      { q:'8²', a:64, big:true, why:'8 × 8 = 64.' },
      { q:'If n = 4, what is 3n − 5?', a:7, big:true, why:'3 × 4 = 12, then 12 − 5 = 7.' },
      { q:'4x = 36. What is x?', a:9, big:true, why:'Divide both sides by 4: x = 9.' },
      { q:'Simplify the ratio 6:9', pick:['2:3','3:2','1:3'], a:0, why:'Both divide by 3: 2:3.' },
      { q:'Find the mean of 5, 10, 15', a:10, why:'They add to 30, and 30 ÷ 3 = 10.' },
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
    { q:'In 470, what is the 7 worth?', pick:['7','70','700'], a:1, why:'The 7 sits in the tens column: 7 tens = 70.' },
    { q:'Which is biggest?', pick:['508','580','805'], a:2, why:'805 has 8 hundreds. The other two have 5 hundreds, so it wins straight away.' },
    { q:'386 + 207', a:593, big:true, why:'6 + 7 = 13, write 3 carry 1. 8 + 0 + 1 = 9. 3 + 2 = 5. Answer 593.' },
    { q:'250 + 250 + 250', a:750, big:true, why:'Two lots of 250 make 500, and one more makes 750.' },
    { q:'384 − 156', a:228, big:true, why:'You cannot do 4 − 6, so borrow: 14 − 6 = 8, then 7 − 5 = 2, then 3 − 1 = 2. Answer 228.' },
    { q:'500 − 240', a:260, big:true, why:'500 − 200 = 300, then − 40 = 260.' },
    { q:'Round 749 to the nearest 100', a:700, why:'The tens digit is 4, which is small, so round down to 700.' },
    { q:'Round 250 to the nearest 100', a:300, why:'250 is exactly halfway between 200 and 300, and a half always rounds up.' },
    { q:'Count by 6s: 18, 24, 30, ?', a:36, why:'Each step adds 6, so 30 + 6 = 36.' },
    { q:'A milbil has $10 and spends $6.50. How much change?', a:3.5, money:true, why:'$6.50 + 50c = $7, + $3 = $10. The change is $3.50.' },
    { q:'How many 50c coins make $4?', a:8, why:'Two 50c coins make $1, so eight make $4.' },
    { q:'Half of 240', a:120, big:true, why:'Half of 24 tens is 12 tens: 120.' },
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
