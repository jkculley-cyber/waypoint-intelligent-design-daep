// Origins scenario library — global (Waypoint-provided) scenarios
// Aligned to TEC Chapter 37 discipline offenses
// Maps to origins_scenarios DB table (migration 044)
// district_id: null = global, available to all districts

export const TEC_OFFENSES = [
  { key: 'fighting',      label: 'Physical Fighting',          ref: '§37.006(a)(2)' },
  { key: 'bullying',      label: 'Bullying & Cyberbullying',   ref: '§37.0832'      },
  { key: 'insubordination', label: 'Insubordination / Disruptive', ref: '§37.001 (SCOC; consequences under §37.005)' },
  { key: 'substances',    label: 'Drug, Alcohol & Vaping',     ref: '§37.006(a)(4)' },
  { key: 'threatening',   label: 'Threatening Language',       ref: '§37.006(a)(1)' },
  { key: 'theft',         label: 'Theft & Vandalism',          ref: '§37.006'       },
  { key: 'technology',    label: 'Technology Misuse',          ref: '§37.082'       },
  { key: 'truancy',       label: 'Truancy / Absenteeism',      ref: '§25.085'       },
]

export const SCENARIOS = [

  // ── FIGHTING ──────────────────────────────────────────────────────────────

  {
    id: 'global-001',
    title: 'When Someone Gets in Your Face',
    description: 'Someone bumps into you hard in the hallway and turns around looking for a fight. What do you do in the next 10 seconds?',
    skill_pathway: 'emotional_regulation',
    tec_offense: 'fighting',
    grade_band: 'both',
    is_active: true,
    content: {
      prompt: 'You\'re walking to class and someone bumps into you — hard. They turn around and stare you down. You can feel your heart racing. What do you do?',
      supports: [
        'Name what your body is feeling right now',
        'Remember: the next 10 seconds decide the next 10 months',
        'You always have more choices than it feels like in that moment',
      ],
      options: [
        {
          text: 'Shove them back and say "Watch where you\'re going."',
          outcome: 'The situation escalates into a physical fight. Both students face DAEP placement under TEC §37.006. A moment of reaction just cost months of school time.',
          score: 0,
        },
        {
          text: 'Stop, breathe, and keep walking without a word.',
          outcome: 'Strong move. You chose your future over 10 seconds of pride. Walking away takes real strength — and it keeps you in school.',
          score: 90,
        },
        {
          text: 'Say calmly, "We\'re good," and move on.',
          outcome: 'Excellent. You de-escalated with confidence — no aggression, no backing down in fear. That\'s the most powerful response in the room.',
          score: 100,
        },
        {
          text: 'Stand there and stare them down without moving.',
          outcome: 'This holds tension without resolving it — the situation is still on a hair trigger. A better move gets you out of the moment entirely.',
          score: 30,
        },
      ],
    },
  },

  {
    id: 'global-002',
    title: 'Your Friend Wants You to Jump In',
    description: 'Your best friend is about to fight someone. They\'re telling you to "have their back." What do you do?',
    skill_pathway: 'conflict_deescalation',
    tec_offense: 'fighting',
    grade_band: 'both',
    is_active: true,
    content: {
      prompt: 'Your best friend is squaring up with someone and looking back at you. "You got me, right?" How do you respond?',
      supports: [
        'Real loyalty means keeping your friend OUT of trouble, not in it',
        'Fighting alongside someone doesn\'t make you loyal — it makes you both lose',
      ],
      options: [
        {
          text: 'Jump in — you always have your friend\'s back.',
          outcome: 'Both of you are now facing DAEP placement. Loyalty that costs you both your education isn\'t loyalty — it\'s a mistake.',
          score: 0,
        },
        {
          text: 'Step between them and say "This isn\'t worth it, let\'s go."',
          outcome: 'Incredibly brave. You used your presence to de-escalate and protect your friend. That\'s the kind of loyalty that actually matters.',
          score: 100,
        },
        {
          text: 'Walk away and leave your friend.',
          outcome: 'You stayed out of trouble, but abandoned someone who needed you. A better move talks them down — not just walks out.',
          score: 40,
        },
        {
          text: 'Go get a teacher or administrator immediately.',
          outcome: 'Smart thinking. Getting an adult involved fast is the move that keeps everyone safe and in school.',
          score: 95,
        },
      ],
    },
  },

  {
    id: 'global-003',
    title: 'The Rematch Pressure',
    description: 'You were in a fight last week. Now people are saying there\'s going to be a rematch after school. What do you do today?',
    skill_pathway: 'rebuilding',
    tec_offense: 'fighting',
    grade_band: 'high',
    is_active: true,
    content: {
      prompt: 'It\'s been a week since an incident. You\'re hearing through the rumor mill that a rematch is being planned for after school. You have the whole school day to make a decision.',
      supports: [
        'You have hours to make a smart choice — use them',
        'Telling an adult about a rumored fight is not snitching — it\'s protecting yourself',
        'Every fight you avoid now builds a different reputation than you think',
      ],
      options: [
        {
          text: 'Show up after school — you\'re not going to look scared.',
          outcome: 'DAEP placement on a second offense within weeks, possible expulsion. "Not looking scared" just cost you the rest of your semester.',
          score: 0,
        },
        {
          text: 'Tell a trusted adult at school what you\'ve heard today.',
          outcome: 'This takes courage and self-awareness. You broke the cycle before it restarted. That\'s the definition of rebuilding.',
          score: 100,
        },
        {
          text: 'Make sure you have a ride home a different way — avoid it entirely.',
          outcome: 'Good instinct to physically remove yourself from the situation. Even better: loop in a trusted adult so the threat is addressed.',
          score: 75,
        },
        {
          text: 'Send a message to the other person calling it off.',
          outcome: 'Good intention, but direct contact can escalate or be used against you. Going through a trusted adult is safer and more effective.',
          score: 50,
        },
      ],
    },
  },

  // ── BULLYING ──────────────────────────────────────────────────────────────

  {
    id: 'global-004',
    title: 'The Group Chat',
    description: 'Your friend group has a chat where people are saying mean things about someone in your class. You\'ve been laughing along. What do you do now?',
    skill_pathway: 'peer_pressure',
    tec_offense: 'bullying',
    grade_band: 'both',
    is_active: true,
    content: {
      prompt: 'The group chat has been going for two days. Someone\'s posting embarrassing pictures and mocking a classmate. Everyone\'s laughing — including you. Today you find out that classmate has seen everything.',
      supports: [
        'Laughing along makes you part of it — even if you didn\'t post anything',
        'It\'s never too late to do the right thing',
        'What you do after finding out matters as much as what you did before',
      ],
      options: [
        {
          text: 'Keep quiet — you didn\'t post anything so it\'s not your problem.',
          outcome: 'Staying silent is a choice too. The person being hurt still knows you saw it and didn\'t say anything. Bystander behavior has real consequences.',
          score: 10,
        },
        {
          text: 'Leave the chat and move on.',
          outcome: 'You removed yourself, which is a start. But the harm is still happening. A stronger move also addresses what your classmate is experiencing.',
          score: 40,
        },
        {
          text: 'Post in the chat: "This needs to stop." Then check on the person targeted.',
          outcome: 'Upstander move. Using your voice in the group AND checking on the person takes real courage. You just changed the culture of that chat.',
          score: 100,
        },
        {
          text: 'Screenshot and report it to a school counselor.',
          outcome: 'Smart. Cyberbullying is documented behavior — having a record protects the student who was targeted and gives adults what they need to act.',
          score: 95,
        },
      ],
    },
  },

  {
    id: 'global-005',
    title: 'Someone\'s Always Being Left Out',
    description: 'Your friend group consistently excludes the same person — small things, but constant. You\'ve noticed it for weeks.',
    skill_pathway: 'conflict_deescalation',
    tec_offense: 'bullying',
    grade_band: 'middle',
    is_active: true,
    content: {
      prompt: 'At lunch, your group quietly moved tables when they saw a certain classmate walking over. Nobody said anything mean — but everyone knew what was happening. You\'ve watched this happen for weeks.',
      supports: [
        'Relational exclusion is bullying — even without words or screens',
        'You don\'t have to take on the whole group. One small gesture changes everything for the person being excluded.',
      ],
      options: [
        {
          text: 'Go with the group. You don\'t want to make things weird.',
          outcome: 'You chose belonging over doing right. The excluded student notices. So do you — and you\'ll keep noticing.',
          score: 0,
        },
        {
          text: 'Stay put and invite the person to sit with you.',
          outcome: 'One person choosing to stay made all the difference. You don\'t have to change the whole group to change someone\'s day.',
          score: 100,
        },
        {
          text: 'Move with the group but text the person separately to check on them.',
          outcome: 'Kind intention — but the public exclusion still happened. The bolder move is the one that interrupts the pattern.',
          score: 55,
        },
        {
          text: 'Talk to your friend group privately about the pattern you\'ve noticed.',
          outcome: 'This takes courage and leadership. Naming a pattern to friends — especially one everyone pretends not to notice — can genuinely change it.',
          score: 90,
        },
      ],
    },
  },

  // ── INSUBORDINATION ───────────────────────────────────────────────────────

  {
    id: 'global-006',
    title: 'The Grade You Don\'t Think Is Fair',
    description: 'You got a 67 on an assignment you worked hard on. You think the grading was unfair. Class is about to start.',
    skill_pathway: 'adult_communication',
    tec_offense: 'insubordination',
    grade_band: 'both',
    is_active: true,
    content: {
      prompt: 'Your teacher hands back an assignment. You got a 67 and you know you put real effort in. You feel frustrated — maybe even humiliated. The teacher moves on to start class. What do you do?',
      supports: [
        'Timing matters: class is not the moment — after class is',
        'The goal is to be heard, not to win. Those are different conversations.',
        '"Can you help me understand..." opens more doors than "This isn\'t fair."',
      ],
      options: [
        {
          text: 'Say out loud: "This grade is ridiculous." Other students hear you.',
          outcome: 'You\'ve now made the teacher look undermined in front of class. Even if you\'re right about the grade, you\'ve made it much harder to get it changed.',
          score: 0,
        },
        {
          text: 'Shut down. Don\'t say anything — just stop participating.',
          outcome: 'Your frustration is valid. But shutting down hurts your grade more, and the teacher may not even notice why.',
          score: 15,
        },
        {
          text: 'Wait until after class and say: "Can I ask you to walk me through the feedback?"',
          outcome: 'Perfect timing, perfect tone. You gave the teacher a chance to explain without an audience. This is the move that sometimes gets grades changed — and always builds respect.',
          score: 100,
        },
        {
          text: 'Email the teacher tonight with your concerns, professionally.',
          outcome: 'Great choice. Written communication gives you a record, gives the teacher time to think, and shows you\'re serious — not just reactive.',
          score: 95,
        },
      ],
    },
  },

  {
    id: 'global-007',
    title: 'The Rule That Seems Pointless',
    description: 'A teacher has a rule you think is unfair and you\'ve been pushing back on it in class. Today it came to a head.',
    skill_pathway: 'adult_communication',
    tec_offense: 'insubordination',
    grade_band: 'middle',
    is_active: true,
    content: {
      prompt: 'Your teacher has a no-phones-at-any-time rule — even for calculators. You think it\'s out of touch and you\'ve been making that clear. Today the teacher asks you to stay after class.',
      supports: [
        'Advocacy and defiance look almost identical from the outside — tone is everything',
        'Adults change rules when students bring solutions, not just complaints',
      ],
      options: [
        {
          text: 'Tell the teacher exactly why the rule is wrong and list all the reasons.',
          outcome: 'You made your case — but delivered it as an argument, not a conversation. Most adults shut down when they feel attacked, even when the point is valid.',
          score: 30,
        },
        {
          text: 'Apologize for your attitude and ask if there\'s a way to revisit the rule together.',
          outcome: 'This resets the relationship AND opens the door to actual change. Acknowledging your approach doesn\'t mean you were wrong about the rule.',
          score: 100,
        },
        {
          text: 'Stay quiet. You don\'t want to make things worse.',
          outcome: 'The tension stays unresolved. Nothing changes — for you or the rule.',
          score: 20,
        },
        {
          text: 'Ask: "What would it take to use phones for school purposes in your class?"',
          outcome: 'Smart framing. You\'re proposing a solution, not attacking a problem. This is the kind of question adults actually respond to.',
          score: 95,
        },
      ],
    },
  },

  {
    id: 'global-008',
    title: 'About to Lose It in Class',
    description: 'Something happened before class that has you furious. You\'re sitting in class and the teacher corrects you for something small. You feel like exploding.',
    skill_pathway: 'emotional_regulation',
    tec_offense: 'insubordination',
    grade_band: 'high',
    is_active: true,
    content: {
      prompt: 'You had a terrible morning — something happened before school that has you on edge. Now your teacher corrected the way you said something in class — in front of everyone. You\'re about to say something you\'ll regret.',
      supports: [
        'The teacher didn\'t cause your morning — but they\'re about to catch all of it',
        'The 3-second rule: before you speak, take three slow breaths',
        'Asking to step out is a sign of self-awareness, not weakness',
      ],
      options: [
        {
          text: 'Fire back at the teacher — you\'re already having the worst day.',
          outcome: 'Office referral. Possible DAEP. And now you\'ve added a school problem to whatever was already wrong today.',
          score: 0,
        },
        {
          text: 'Raise your hand and ask the teacher if you can step out for a minute.',
          outcome: 'Exceptional self-regulation. Recognizing you\'re about to lose it and removing yourself is one of the most mature moves you can make.',
          score: 100,
        },
        {
          text: 'Take three slow breaths. Stay quiet for the rest of class.',
          outcome: 'Good. You held it. The teacher\'s correction wasn\'t the real problem — and you knew that. That awareness kept you in class.',
          score: 85,
        },
        {
          text: 'Write out what you\'re feeling in your notebook instead of responding.',
          outcome: 'Smart outlet. Getting it out of your head and onto paper breaks the cycle before it explodes outward.',
          score: 80,
        },
      ],
    },
  },

  // ── SUBSTANCES ────────────────────────────────────────────────────────────

  {
    id: 'global-009',
    title: 'Your Friends Want You to Try It',
    description: 'You\'re hanging out with friends after school and someone pulls out a vape. Everyone looks at you.',
    skill_pathway: 'peer_pressure',
    tec_offense: 'substances',
    grade_band: 'both',
    is_active: true,
    content: {
      prompt: 'You\'re at a friend\'s house after school. Someone produces a vape and passes it around. Everyone takes a hit. Now it\'s coming to you. They\'re waiting.',
      supports: [
        'Peer pressure in 2025 is mostly social — it\'s about belonging, not substances',
        'You always have more exits than it feels like in the moment',
        'One sentence is all you need — you don\'t owe anyone an explanation',
      ],
      options: [
        {
          text: 'Try it — you don\'t want to be the only one who doesn\'t.',
          outcome: 'Possession or use of a vaping device at school or at a school activity is a mandatory DAEP placement. The pressure of a moment isn\'t worth months away from your campus.',
          score: 0,
        },
        {
          text: 'Say "I\'m good" and pass it along without explanation.',
          outcome: 'Smooth and social. You didn\'t make it a big deal — which means nobody else did either. That\'s the most underrated refusal technique there is.',
          score: 100,
        },
        {
          text: 'Say "My parents randomly drug test me — can\'t risk it" and pass it.',
          outcome: 'The "blame your parents" technique is legitimate and effective. You gave yourself a social exit without having to explain your values.',
          score: 100,
        },
        {
          text: 'Get up and leave immediately without saying anything.',
          outcome: 'You protected yourself. Leaving is always a valid choice — especially if you don\'t have a word ready.',
          score: 85,
        },
      ],
    },
  },

  {
    id: 'global-010',
    title: 'After a Mistake with Substances',
    description: 'You got caught vaping at school. You\'re now returning from DAEP. How do you rebuild?',
    skill_pathway: 'rebuilding',
    tec_offense: 'substances',
    grade_band: 'high',
    is_active: true,
    content: {
      prompt: 'You\'ve served your DAEP placement. Today is your first day back on your home campus. You know the circumstances that led to the incident. You know some of the same situations are waiting for you.',
      supports: [
        'Coming back is a second chance — very few people use it as well as they could',
        'The situation that led here is still there. The question is whether you\'re different.',
        'You don\'t have to announce your growth — just live it',
      ],
      options: [
        {
          text: 'Reconnect with the same friend group immediately and act like nothing changed.',
          outcome: 'If the circumstances haven\'t changed, the outcome probably won\'t either. The hardest part of rebuilding is changing the patterns, not just the intentions.',
          score: 10,
        },
        {
          text: 'Connect with your school counselor on day one to set up a check-in plan.',
          outcome: 'Proactive and smart. You\'re acknowledging that rebuilding takes support, not just willpower. That\'s the insight most adults don\'t develop until much later.',
          score: 100,
        },
        {
          text: 'Keep your head down, work hard, and prove it through action.',
          outcome: 'Solid approach. Action speaks louder than any conversation. Pair this with one trusted adult at school and you\'re in the best possible position.',
          score: 85,
        },
        {
          text: 'Avoid everyone from your old friend group permanently.',
          outcome: 'The instinct to separate is right. Total avoidance is hard to maintain — having a plan for what to do in unavoidable moments is more sustainable.',
          score: 60,
        },
      ],
    },
  },

  // ── THREATENING LANGUAGE ──────────────────────────────────────────────────

  {
    id: 'global-011',
    title: 'When You\'re Furious and Words Come Out',
    description: 'In the heat of anger, you said something threatening. You didn\'t mean it literally — but it was heard.',
    skill_pathway: 'emotional_regulation',
    tec_offense: 'threatening',
    grade_band: 'both',
    is_active: true,
    content: {
      prompt: 'After a confrontation in the hallway, you were furious. In the heat of the moment, you said something like "I\'ll get you for that." A teacher overheard. Now you\'re in the office.',
      supports: [
        'Intent and impact are two different things — schools are required to act on what was said',
        'The most powerful thing you can say right now is the truth about what you actually meant',
        'This is a moment to repair, not defend',
      ],
      options: [
        {
          text: 'Insist you didn\'t mean anything by it and demand to go back to class.',
          outcome: 'Defensiveness without context makes the situation worse. Administrators are required to take threats seriously — working with them, not against them, is how this resolves faster.',
          score: 5,
        },
        {
          text: 'Explain honestly: "I was angry and I said something I didn\'t mean. I want to explain what actually happened."',
          outcome: 'This is the right move. Honest context — delivered calmly — is what allows adults to respond to what actually happened instead of just the words.',
          score: 100,
        },
        {
          text: 'Stay quiet and wait for your parents to arrive.',
          outcome: 'Staying quiet is understandable. But getting ahead of it with an honest explanation gives you more control over the outcome.',
          score: 40,
        },
        {
          text: 'Apologize directly to the person you said it to, in front of staff.',
          outcome: 'A direct apology demonstrates accountability and helps the other student feel safe. This is one of the most powerful de-escalation moves available.',
          score: 90,
        },
      ],
    },
  },

  {
    id: 'global-012',
    title: 'When a Friend Says Something Scary',
    description: 'Your friend told you something that scared you. They said you can\'t tell anyone. What do you do?',
    skill_pathway: 'adult_communication',
    tec_offense: 'threatening',
    grade_band: 'high',
    is_active: true,
    content: {
      prompt: 'Your close friend pulled you aside and said something — about themselves or about someone else — that genuinely scared you. They said "don\'t say anything." You\'re sitting in class trying to focus and you can\'t.',
      supports: [
        'The promise to stay silent doesn\'t outweigh someone\'s safety',
        'Telling an adult is not betrayal — it is the most loyal thing you can do',
        'You don\'t have to have all the information. Just enough to say "I\'m worried about my friend."',
      ],
      options: [
        {
          text: 'Honor your promise. Stay quiet and hope it blows over.',
          outcome: 'Keeping a dangerous secret because of a promise is a burden you shouldn\'t carry — and a risk your friend can\'t afford. Silence isn\'t loyalty here.',
          score: 0,
        },
        {
          text: 'Tell a school counselor or trusted adult what you heard today.',
          outcome: 'The hardest and most important choice. You may feel like you broke trust — but you may have also saved a life or prevented serious harm. That\'s real loyalty.',
          score: 100,
        },
        {
          text: 'Text your friend: "I\'m worried about you. I\'m going to tell someone because I care about you."',
          outcome: 'Telling them first is thoughtful. But don\'t wait for their permission — tell an adult today regardless of their response.',
          score: 80,
        },
        {
          text: 'Wait to see if things seem better tomorrow.',
          outcome: 'Tomorrow may be too late. When you\'re genuinely worried, the right moment to act is now.',
          score: 10,
        },
      ],
    },
  },

  // ── THEFT & VANDALISM ─────────────────────────────────────────────────────

  {
    id: 'global-013',
    title: 'Everyone\'s Taking Things',
    description: 'Your friend group has been casually shoplifting from a store near school. They\'re acting like it\'s normal. They want you to participate.',
    skill_pathway: 'peer_pressure',
    tec_offense: 'theft',
    grade_band: 'middle',
    is_active: true,
    content: {
      prompt: 'After school, your group stops at a convenience store. You\'ve watched your friends pocket things before. Today they hand you something and say "just put it in your bag." The clerk is looking the other way.',
      supports: [
        'What feels normalized by a group is still a choice — and still a consequence',
        'A misdemeanor or felony on a juvenile record follows you further than most teens understand',
      ],
      options: [
        {
          text: 'Put it in your bag. Everyone else does it.',
          outcome: 'Everyone getting caught together doesn\'t mean everyone suffers equally. Theft charges follow you. Your friends\'  choices don\'t protect you from your own.',
          score: 0,
        },
        {
          text: 'Put it back quietly and say "I\'m good" without making it a thing.',
          outcome: 'Low-drama, high-integrity. You didn\'t lecture anyone — you just made your own choice. That\'s all it takes.',
          score: 100,
        },
        {
          text: 'Say "I\'ll wait outside" and leave the store.',
          outcome: 'Smart. Removing yourself from the situation entirely protects you from being present if anything happens.',
          score: 90,
        },
        {
          text: 'Do it this once but tell your friends after that you\'re not doing it again.',
          outcome: '"Just this once" is the beginning of a pattern, not an exception to one.',
          score: 5,
        },
      ],
    },
  },

  {
    id: 'global-014',
    title: 'Making It Right After a Mistake',
    description: 'You damaged school property in a moment of frustration. You weren\'t caught — but you know what you did.',
    skill_pathway: 'rebuilding',
    tec_offense: 'theft',
    grade_band: 'both',
    is_active: true,
    content: {
      prompt: 'In a moment of frustration, you damaged something at school. Nobody saw it. The school doesn\'t know it was you. But you know — and it\'s been bothering you for two days.',
      supports: [
        'Accountability you choose is worth ten times the accountability you\'re forced into',
        'Making it right is not the same as getting caught — it\'s what you do when you could get away with it',
      ],
      options: [
        {
          text: 'Do nothing. Nobody knows — move on.',
          outcome: 'You\'re carrying this — and it tends to get heavier, not lighter. The guilt is information: it\'s telling you something about who you want to be.',
          score: 0,
        },
        {
          text: 'Tell a trusted adult privately and ask how to make it right.',
          outcome: 'This is the definition of integrity. Coming forward when you didn\'t have to is the move that builds a reputation you can be proud of — and gets you much more grace.',
          score: 100,
        },
        {
          text: 'Anonymously fix or pay for what you damaged.',
          outcome: 'The repair matters. The anonymity is understandable. If you can take the full step and own it, you\'ll feel better — but this is still the right direction.',
          score: 75,
        },
        {
          text: 'Tell your parent or guardian and ask for their help figuring out next steps.',
          outcome: 'Bringing in a trusted adult on your own terms is a sign of real maturity. Your parent can help you navigate this in the best possible way.',
          score: 95,
        },
      ],
    },
  },

  // ── TECHNOLOGY ────────────────────────────────────────────────────────────

  {
    id: 'global-015',
    title: 'The Phone Comes Out in Class',
    description: 'You\'re in class and your phone buzzes. You know the rule — but the text feels urgent.',
    skill_pathway: 'emotional_regulation',
    tec_offense: 'technology',
    grade_band: 'both',
    is_active: true,
    content: {
      prompt: 'Your phone buzzes in class. You know you\'re not supposed to look at it. But something in your gut says it might be important. The teacher\'s back is turned.',
      supports: [
        'The urgency you feel about a phone notification is almost always exaggerated',
        'Your attention is valuable — the world is designed to interrupt it',
        'Five minutes of impulse control now vs. a confiscated phone for the day',
      ],
      options: [
        {
          text: 'Quickly check it — just a second. Nobody\'ll notice.',
          outcome: 'The teacher noticed. Phone confiscated. And the text wasn\'t urgent. The moment of "just checking" cost you the whole day.',
          score: 0,
        },
        {
          text: 'Leave it in your bag and check it after class.',
          outcome: 'This is the skill. The notification will still be there in 45 minutes. You chose your education over your impulse. That\'s hard — and worth it.',
          score: 100,
        },
        {
          text: 'Ask the teacher if you can step out to take an urgent call.',
          outcome: 'If it\'s genuinely urgent, this is the right move. Asking permission before acting is always better than acting and getting caught.',
          score: 85,
        },
        {
          text: 'Put the phone on silent under your desk and check it between questions.',
          outcome: 'You\'re half-present in class and still at risk of getting caught. The discipline of leaving it alone entirely is the actual skill.',
          score: 20,
        },
      ],
    },
  },

  {
    id: 'global-016',
    title: 'The Screenshot That Spread',
    description: 'Someone sent you a screenshot of a private conversation and asked you to share it. It would humiliate someone.',
    skill_pathway: 'adult_communication',
    tec_offense: 'technology',
    grade_band: 'high',
    is_active: true,
    content: {
      prompt: 'A friend sends you a screenshot of someone\'s private messages — embarrassing stuff. "Send it around — this is too good." You know how this ends for the person in the screenshot.',
      supports: [
        'Forwarding is participating — even if you didn\'t create it',
        'Screenshots are permanent. The person who forwarded it is traceable.',
        'What would you want someone to do if this were your private message?',
      ],
      options: [
        {
          text: 'Forward it to a few people — it\'s already out there.',
          outcome: 'You\'ve now participated in cyberbullying under TEC §37.0832. "It was already out there" is not a defense — it\'s a rationalization.',
          score: 0,
        },
        {
          text: 'Delete it and tell your friend: "I\'m not doing this."',
          outcome: 'Clean and clear. You didn\'t lecture — you just didn\'t participate. One person stopping the spread matters more than it seems.',
          score: 100,
        },
        {
          text: 'Save it but don\'t forward it.',
          outcome: 'You kept it — and that creates risk and responsibility. Deleting it removes you from the situation entirely.',
          score: 30,
        },
        {
          text: 'Tell the person in the screenshot what\'s being shared so they know.',
          outcome: 'This is an upstander move. Alerting someone that their private information is being spread gives them a chance to protect themselves.',
          score: 90,
        },
      ],
    },
  },

  // ── TRUANCY ───────────────────────────────────────────────────────────────

  {
    id: 'global-017',
    title: 'I Really Don\'t Want to Go Today',
    description: 'You wake up and the thought of going to school feels impossible. Something is going on — you\'re just not sure what.',
    skill_pathway: 'adult_communication',
    tec_offense: 'truancy',
    grade_band: 'both',
    is_active: true,
    content: {
      prompt: 'It\'s 6:45 AM. Your alarm went off. The thought of getting up and going to school today feels genuinely impossible. Nothing specific happened — you just can\'t. What do you do?',
      supports: [
        '"I can\'t" and "I won\'t" are different — and your gut usually knows which one it is',
        'Skipping makes tomorrow harder, not easier',
        'Telling someone what\'s going on is the fastest way out of this feeling',
      ],
      options: [
        {
          text: 'Tell your parent you\'re sick and stay home.',
          outcome: 'If you\'re not physically sick, avoiding the problem today makes it bigger tomorrow. And repeated absences have real academic and legal consequences under TEC §25.085.',
          score: 10,
        },
        {
          text: 'Tell a parent honestly: "I\'m really struggling today and I don\'t know why."',
          outcome: 'This is brave. Something is going on, and naming it — even without knowing exactly what — opens the door to actual support.',
          score: 100,
        },
        {
          text: 'Go to school and ask to see the counselor first thing.',
          outcome: 'You showed up even when it was hard — and you sought support. That\'s exactly the right instinct. Counselors are there for this.',
          score: 95,
        },
        {
          text: 'Go to school, push through, and tell yourself it\'ll get better.',
          outcome: 'Showing up matters. And if it keeps feeling this heavy, telling someone is the next step — pushing through alone has a limit.',
          score: 70,
        },
      ],
    },
  },

  {
    id: 'global-018',
    title: 'Too Many Days Gone',
    description: 'You\'ve missed 12 days this semester. The school has sent notices. You\'re behind on everything. It feels impossible to catch up.',
    skill_pathway: 'rebuilding',
    tec_offense: 'truancy',
    grade_band: 'high',
    is_active: true,
    content: {
      prompt: 'You\'ve been avoiding school more than attending. You\'re now 12 days absent this semester. You just got a notice that you may not receive credit. The thought of catching up feels completely overwhelming.',
      supports: [
        'The only way to stop the hole from getting deeper is to stop digging',
        'You don\'t have to figure out all 12 days at once — just tomorrow',
        'Most teachers and counselors will meet you where you are if you take the first step',
      ],
      options: [
        {
          text: 'Stay home again today — it\'s too far behind to fix anyway.',
          outcome: 'Day 13 makes the credit situation worse and moves you further from the conversation that could actually help. The time to start is always now.',
          score: 0,
        },
        {
          text: 'Show up and go straight to your counselor before first period.',
          outcome: 'The hardest day to come back is the first one. You did it — and you went to the right person first. That conversation is the one that maps the path forward.',
          score: 100,
        },
        {
          text: 'Email your teachers to ask what you can do to recover your grades.',
          outcome: 'Good initiative. Email first, then show up in person. Teachers respond to students who reach out proactively.',
          score: 85,
        },
        {
          text: 'Ask a parent to come to school with you to help figure out the plan.',
          outcome: 'Having a parent in your corner for this conversation is a smart move. You\'re not going to get in more trouble for asking for help.',
          score: 90,
        },
      ],
    },
  },
]

// ── Reflection prompts by pathway ────────────────────────────────────────────
export const REFLECTION_PROMPTS = {
  emotional_regulation: [
    'When you feel yourself getting really angry or overwhelmed, what does your body feel like?',
    'Has a situation like this actually happened to you? What did you do — honestly?',
    'What makes it hardest for you to pause before reacting?',
  ],
  conflict_deescalation: [
    'What usually stops you from walking away from a conflict?',
    'Think about the last time you had a real conflict. How did it end — and how did you feel afterward?',
    'What would it feel like to de-escalate a situation without feeling like you lost?',
  ],
  peer_pressure: [
    'Why can it feel risky to say no to your friends sometimes?',
    'What\'s the social pressure like in your friend group around situations like this?',
    'What would help you feel more confident making your own choice next time?',
  ],
  rebuilding: [
    'When you make a mistake, what\'s usually the hardest part of making it right?',
    'Think of a time you did something you regret. Did you ever go back and address it?',
    'What does it mean to you to do the right thing even when no one is watching?',
  ],
  adult_communication: [
    'When an adult seems unfair or wrong, what\'s your first instinct?',
    'Is there an adult at school you could actually talk to if something was hard? Who comes to mind?',
    'What makes it hard to speak up respectfully instead of shutting down or blowing up?',
  ],
}

// ── Conversation starters for parents (based on choice quality) ───────────────
export function getConversationStarters(scenario, option) {
  const isStrong = option.score >= 85
  const isPoor   = option.score < 50
  const offense  = TEC_OFFENSES.find(o => o.key === scenario.tec_offense)

  const pathwayStarters = {
    emotional_regulation: {
      strong: 'I saw you worked through a situation about staying calm under pressure — and you made a strong choice. What helped you think it through that way?',
      poor:   'I saw you worked through a scenario about managing anger. No judgment at all — I\'m curious: what made that feel like the right call in the moment?',
      mid:    'I saw you completed a scenario about staying calm in tough moments. Tell me about what was going through your mind.',
    },
    conflict_deescalation: {
      strong: 'You worked through a scenario about walking away from a conflict — and chose to de-escalate. What does "walking away" feel like to you?',
      poor:   'You worked through a conflict scenario. I want to understand: when something like that happens, what does it feel like inside right before you react?',
      mid:    'You completed a scenario about handling conflict. What\'s the hardest part of de-escalating for you personally?',
    },
    peer_pressure: {
      strong: 'You worked through a peer pressure scenario and made a confident choice. What made it easier to say no in that situation?',
      poor:   'You worked through a scenario about peer pressure. Tell me — when your friends are all doing something, what does that pressure actually feel like?',
      mid:    'You completed a scenario about peer pressure. What goes through your mind when you\'re in a situation like that?',
    },
    rebuilding: {
      strong: 'You worked through a scenario about making things right — and chose accountability. What does it feel like to do the hard thing?',
      poor:   'You worked through a scenario about rebuilding after a mistake. No lecture — I\'m just curious: what makes it hard to go back and make something right?',
      mid:    'You completed a scenario about accountability. What\'s the scariest part of admitting a mistake to someone?',
    },
    adult_communication: {
      strong: 'You worked through a scenario about talking to adults — and chose to communicate well. Is there an adult at school you actually feel like you could go to?',
      poor:   'You worked through a scenario about communicating with adults. What makes that hard sometimes — like, what gets in the way?',
      mid:    'You completed a scenario about talking to adults. What would make it easier to bring something up to a teacher or counselor?',
    },
  }

  const level     = isStrong ? 'strong' : isPoor ? 'poor' : 'mid'
  const starter1  = pathwayStarters[scenario.skill_pathway]?.[level] || 'Tell me about the scenario you worked through today.'
  const starter2  = offense
    ? `We\'ve been talking about ${offense.label.toLowerCase()} — what does that look like in your school right now?`
    : 'What was the hardest part of working through that scenario?'

  return [starter1, starter2]
}

// Helper: get scenarios by TEC offense
export function getScenariosByOffense(offenseKey) {
  return SCENARIOS.filter(s => s.content?.tec_offense === offenseKey || s.tec_offense === offenseKey)
}

// Helper: get scenarios by pathway
export function getScenariosByPathway(pathway) {
  return SCENARIOS.filter(s => s.skill_pathway === pathway)
}

// Helper: get offense meta
export function getOffenseMeta(offenseKey) {
  return TEC_OFFENSES.find(o => o.key === offenseKey)
}
