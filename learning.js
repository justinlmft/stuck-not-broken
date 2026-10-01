/* ============================================================================
   Learning: the Recommended Learning library (Roadmap essential #2, the reader).
   Spec: snb-business Projects/App Designer/Reader-Rework/READER-BLOG-SPEC.md ("Recommended Learning")
   and LEARNING-GROUPS.md (the group map). Justin's blog posts, book pieces and podcast episodes,
   reworked for the app at full length; each piece carries callouts ("{Name}'s freeze") that app.js
   fills from the member's own check-ins. Pieces join as Justin approves them.

   The rotation (Justin, 2026-10-01): each post tries one way of matching, rotating post to post:
   its main state, its main insight, the member's journal answer. The way points to a GROUP of related
   pieces, and the app cycles to the next piece in that group. If a way finds no piece, the next way
   is tried; if none does, the post has no Recommended Learning.
   Blocks: {p} {h} {h3} {ul} {ol} {q} (a quote) {callout:id} {practice:'anchoring'|'mindfulness'|'custom', sense?, why}.
   Inline: **bold**, *italic*, [text](https://...). Any mention of the Unstucking Academy links to
   https://www.stucknotbroken.com/checkout/co-regulator (Justin, 2026-10-01). A {practice} block offers
   the closest practice the app has (Justin: match it as closely as possible) where the piece talks about one (safety anchoring, mindfulness), or the member's custom
   practice when the piece calls for practice in general.
   Exposes window.Learning.
   ========================================================================== */
(function (global) {
  'use strict';
  const PIECES = [
 {
  "id": "functional-freeze",
  "title": "Functional freeze: what it is and how to come out of it",
  "state": "freeze",
  "groups": [
   "freeze",
   "work",
   "hard"
  ],
  "minutes": 8,
  "source": "stucknotbroken.com/c/blog/functional-freeze",
  "blocks": [
   {
    "p": "You're getting things done. Showing up, answering texts, and making dinner. But underneath all of it, you feel flat, far away, like you're watching your own life through a foot of glass."
   },
   {
    "p": "This is called functional freeze."
   },
   {
    "callout": "freeze-share"
   },
   {
    "p": "Once you understand what it is, you can then learn what to do about it. I'll break down what it is, why it's there, and small ways to start coming out of it."
   },
   {
    "h": "Functional freeze, plainly"
   },
   {
    "p": "Freeze isn't its own separate state, the way it usually gets pictured. Freeze is an autonomic mixed state. A mixed state results from two primary autonomic states being active simultaneously. Here's a list of the mixed states:"
   },
   {
    "ul": [
     "play = ventral vagal safety + sympathetic flight/fight",
     "stillness = ventral vagal safety + dorsal vagal shutdown",
     "freeze = sympathetic flight/fight + dorsal vagal shutdown"
    ]
   },
   {
    "p": "Freeze combines mobility plus immobility. It's like having the gas pedal and the brake pressed at the same time. There's mobilization running (the gas, your sympathetic branch getting you ready to act) and there's shutdown running, too (the brake, your dorsal branch pulling you toward numb and still). Both at once. That's freeze."
   },
   {
    "p": "So what does \"functional\" add? It describes the severity, not a different state. \"Functional\" just means you can still do your day while in freeze. A functional freeze can be mild (tense but managing) or more severe (chronic panic, overwhelm, rage, or fear underlying everything you do)."
   },
   {
    "p": "Alright, we have the two ingredients: \"functional\" and \"freeze.\" Now, we'll tell functional freeze apart from other experiences."
   },
   {
    "h": "Functional freeze vs. burnout, depression, and full shutdown"
   },
   {
    "p": "These can get confusing, and the mix-up can send people to the wrong help. We'll tease them apart:"
   },
   {
    "ul": [
     "<b>Functional freeze:</b> tense but numb; still functioning. A functional level of the freeze mixed state, probably relying on coping mechanisms like doom-scrolling and overworking.",
     "<b>Burnout:</b> wiped out, drained, running on empty. More about depletion over time than a defense state. Likely experienced as a result of a functional freeze. After \"recovering\" from burnout, the person returns to their functional freeze baseline, then repeats.",
     "<b>Depression:</b> a clinical disorder diagnosis featuring low mood, low energy, low motivation, most days, for weeks.",
     "<b>Dorsal vagal shutdown:</b> the same symptoms as depression. Through the Polyvagal Theory lens, dorsal vagal shutdown is the neurobiological mechanism underlying a diagnosis of depression. Shutdown probably has a lot to do with burnout as well. Cycling between freeze and shutdown is common, leading to periods of burnout and then of overwhelm, over and over."
    ]
   },
   {
    "callout": "freeze-and-shutdown"
   },
   {
    "h": "What functional freeze feels like from the inside"
   },
   {
    "p": "Dani is having a normal Tuesday. Inbox handled. Kid picked up. A \"yeah, good, you?\" to the neighbor. Inside, Dani feels like the volume on everything got turned up, despite smiling on the outside. Dani doesn't notice the taste of their food. Too much on the mind. Something funny is said in a group chat and Dani doesn't know how to respond, overthinks it, and moves on. There's a low hum of <i>I should be doing more</i> that never turns into actually doing more."
   },
   {
    "p": "Dani isn't broken. Dani's gas and brake are both on."
   },
   {
    "p": "The signs people describe tend to cluster:"
   },
   {
    "ul": [
     "Wired underneath the flatness, on edge without a clear reason",
     "Feeling far away from people, even people you love",
     "Underlying panic, rage, overwhelm, and/or fear",
     "Tension that doesn't dissolve, shallow breathing and pressure",
     "A revolving door of tension and collapse",
     "Hard to start things, hard to care about things you usually care about"
    ]
   },
   {
    "p": "The severity of a functional freeze depends on coping capacity and the system's baseline level of safety. More safety = more manageability."
   },
   {
    "callout": "safety-share"
   },
   {
    "p": "A functional freeze is still a lot, don't get me wrong. And likely, you'll manage the day and then collapse when you can before repeating. More safety makes it more manageable, but doesn't lead to an overall change in the system."
   },
   {
    "p": "As enough safety is built, the entire system can re-regulate. But the safety state needs to be built to a high enough level and maintained while the system re-regulates. Depending on the severity of one's freeze mixed state, this is potentially a long process that requires lots of patience."
   },
   {
    "h": "Why freeze happens, and the nervous system's logic"
   },
   {
    "p": "Your nervous system has a simple, old job: keep you safe. When something feels like too much, it shifts to defense. Fight-or-flight is the mobilized one (the gas). But when fight-or-flight isn't possible, the body reaches for an older defense: it slams the brakes in shutdown."
   },
   {
    "p": "Freeze is what you get when the brake comes on, but the gas is still pressed. No, it's not a malfunction. It's protection doing exactly what it evolved to do."
   },
   {
    "p": "What's the benefit of freeze? Well, keep in mind that freeze evolved to be temporary, not endless. A temporary freeze is perfect for immobilizing as a danger passes. Or bracing for impact. Or coiling up like a spring and then releasing when it can."
   },
   {
    "p": "Obviously, the problem is that we humans tend to get stuck (not broken) in freeze and other defensive states. That stuckness is where the evolutionary benefit gets lost and life becomes much more difficult."
   },
   {
    "h": "Why pushing through and zoning out both make it worse"
   },
   {
    "p": "Alright, so what to do about it?"
   },
   {
    "p": "\"Just push through it.\" Yeah, sure, to get through a meeting. But pushing adds more gas. And more sympathetic load doesn't break the freeze, it deepens it. More gas against a stuck brake means more freeze, and over time it can tip you into shutdown. You end up more wound up and more shut down at once than when you started, solidifying the freeze-to-shutdown cycle."
   },
   {
    "p": "\"Just rest and do nothing.\" Rest is important here. But it has to be done mindfully. Rest done mindlessly, collapsing onto the couch and disappearing into a screen for six hours, tends to solidify the dorsal, or turn into a cycle where you rest, feel worse, rest more, feel worse. \"Rest\" can also be a mindless escape from the underlying freeze. The rest that helps is the kind where you're actually present for it and mindful of the present moment."
   },
   {
    "p": "So if it's not push harder and it's not check out, what is it?"
   },
   {
    "h": "Coming out of freeze: small cues of safety"
   },
   {
    "p": "The way out runs in a specific order and depends entirely on the strength of the ventral vagal safety pathways."
   },
   {
    "p": "Safety has to thaw the freeze first."
   },
   {
    "p": "When your body picks up enough small cues that it's safe right now, the brake (the shutdown) can ease off. And once the shutdown lifts, the mobilization that was stuck underneath can finally move instead of sitting there, frozen. Safety thaws the freeze, shutdown releases, then the previously frozen flight/fight can move through the system."
   },
   {
    "callout": "practice-rise"
   },
   {
    "p": "But the safety state needs to hold as this process unfolds. Which means it needs to strengthen. Which means this thawing and releasing process does not happen all at once. It happens over time, usually in doses."
   },
   {
    "callout": "freeze-eased"
   },
   {
    "p": "You don't do this with one big intervention. You do it with small, repeatable cues of safety and gentle mobilization, a little at a time."
   },
   {
    "p": "Here's one small, quick way to start thawing freeze now. It's a quick practice, but I broke it down into a few small steps."
   },
   {
    "h3": "Practice: quick orienting and small movement"
   },
   {
    "ol": [
     "Exist wherever you are, and however you are. Sit, stand, walk, lie down, doesn't matter.",
     "Allow your eyes to take you where they want you to. (You can use other senses instead, but I recommend one sense at a time.)",
     "Mindfully notice what's moving in the environment, like a leaf on a branch on a tree. Mindfully notice which colors your eyes are drawn to. Mindfully notice light and shadow. (Do steps 1 to 3 for 30 seconds, or however long you want.)",
     "Take in one intentional, bigger breath and let it out slowly. (If comfortable; don't force it.)",
     "Monitor your next two breaths as they come in and out at their own natural rhythm. (Don't control. Just be with your breath. If it changes by itself, that's fine.)",
     "Acknowledge the underlying freeze within you. Feel it directly at a very low level if you have the capacity. (Keep this step very brief.)",
     "Do one small movement, like wiggling your toes, making a fist and relaxing it, or rolling your wrists, ankles, or shoulders.",
     "Tell yourself, \"Good job, self.\"",
     "Pay attention to what your eyes want to show you again, and then take one more intentional breath to end things."
    ]
   },
   {
    "p": "Letting your eyes take you where they like is a cue of safety. The small movement is a gentle mobilization. Small doses. You're not trying to feel great. You're giving the brake permission to come off a few millimeters. And then permitting the stuck flight/fight to move just a tad."
   },
   {
    "p": "No, the above practice does not solve all of your problems or cure your freeze. But it does help lay a strong foundation over time. It helps build a mindfulness practice, connect with the external and internal worlds, build safety, and even reduce defense."
   },
   {
    "p": "In very small doses, little by little."
   },
   {
    "practice": "anchoring",
    "sense": "movement",
    "why": "Freeze eases when safety comes first. This practice anchors you in safety through movement."
   },
   {
    "p": "Over time, you may notice small shifts in practices like these, like little shivers or tingles leaving your body. You may notice a spontaneous, bigger breath come in and out on its own. You may notice yawning. All of these are small signs of self-regulation."
   },
   {
    "p": "Over time, you'll feel into the stuck defense more deliberately, balanced with safety and the present moment."
   },
   {
    "p": "Over time, as safety builds and is maintained, your body can release larger doses of freeze."
   },
   {
    "h": "When to reach for support"
   },
   {
    "p": "A functional freeze is common and workable, and most of the time, small daily practices are enough to start shifting it, especially when combined with mindful rest."
   },
   {
    "p": "But if it's been heavy for weeks, if it's tipped into full shutdown (collapsed, unable to function), if the panic or overwhelm underneath has gotten hard to carry, or if it comes with thoughts that worry you, that's worth bringing to a professional."
   },
   {
    "h": "Key points to remember"
   },
   {
    "ul": [
     "Freeze is a mixed state: gas and brake at the same time. Sympathetic + dorsal.",
     "\"Functional\" describes behavior and coping, and the severity of the freeze, not a separate state: mild (tense but managing) up to severe (panic, overwhelm, rage, or fear under everything).",
     "Freeze isn't a milder version of shutdown. They're different states, and people often cycle between them.",
     "More pushing means more freeze, and over time, more shutdown.",
     "Rest helps only when it's done mindfully.",
     "Safety thaws the freeze, the shutdown lifts, and then flight/fight can finally move."
    ]
   }
  ]
 },
 {
  "id": "polyvagal-safety",
  "title": "Polyvagal safety: what it is and how to build it",
  "state": "safety",
  "groups": [
   "safety",
   "build"
  ],
  "minutes": 8,
  "source": "stucknotbroken.com/c/blog/polyvagal-safety",
  "blocks": [
   {
    "p": "First and foremost: <b>Polyvagal safety is not just a feeling.</b> It's not positive thinking or wishful thinking. How you think and feel are a part of Polyvagal safety, but there's more to it."
   },
   {
    "p": "It's <b>biology</b>. Polyvagal safety is biology, not feelings. It refers to active ventral vagal pathways that enable connection and social engagement."
   },
   {
    "h": "Understanding Polyvagal safety: biology, not just feelings"
   },
   {
    "p": "When we talk about Polyvagal Theory, we're referring to your autonomic nervous system, the biological system that drives your survival responses beneath conscious awareness. Polyvagal safety refers explicitly to the <b>ventral vagal</b> pathways of the parasympathetic nervous system. Think of these pathways as neural highways that, when active, shift your entire system from \"survival mode\" to \"connection mode.\""
   },
   {
    "p": "And that shift changes everything."
   },
   {
    "h3": "What happens when your ventral vagal pathways are active"
   },
   {
    "p": "When the ventral vagal pathways are engaged, your body becomes capable of something remarkable: real connection, with yourself and with others."
   },
   {
    "p": "This is where social engagement happens. This is where co-regulation (receiving calming cues from another safe person) becomes possible. When you're in your Polyvagal safety state, you can:"
   },
   {
    "ul": [
     "Smile for real (not a forced, tight-lipped smile, but a real one with eye crinkles)",
     "Use vocal prosody (the natural melody and warmth in your voice that communicates safety)",
     "Make close physical contact without fear or tension",
     "Play while remaining socially connected",
     "Be still without fear or numbness"
    ]
   },
   {
    "p": "These aren't achievements you need to work toward. They're biological capacities that naturally emerge when your ventral vagal system is active. When it's not active? These capacities disappear. You can't force them. You can't think your way into them. Your biology simply doesn't have access to them yet."
   },
   {
    "callout": "safety-share"
   },
   {
    "h3": "The mixed states: play and stillness"
   },
   {
    "p": "Here's something many people miss about Polyvagal safety: it allows for \"mixed states\" or \"hybrid states.\""
   },
   {
    "p": "Human nervous systems don't typically operate in extremes, like a reptile's would. We aren't completely mobilized in flight/fight or immobile in shutdown. This is because our primary states can mix."
   },
   {
    "p": "When the ventral vagal safety state is active, it results in these Polyvagal mixed states:"
   },
   {
    "ul": [
     "<b>Play:</b> You can be mobile with a safe other and have fun.",
     "<b>Stillness:</b> You can be immobile while alone without fear.",
     "<b>Intimacy:</b> You can be immobile with a safe other and be okay with it."
    ]
   },
   {
    "callout": "mixed-safe"
   },
   {
    "h": "Accessing Polyvagal safety: what you actually need"
   },
   {
    "p": "You probably want to know: \"How do I get into this state?\" And you're right to ask. Accessing Polyvagal safety requires two foundational conditions, plus one more thing that many people overlook."
   },
   {
    "h3": "Condition 1: environmental safety"
   },
   {
    "p": "First, you need literal physical safety. Freedom from actual danger to your body."
   },
   {
    "p": "But it goes deeper than that. Your nervous system is constantly scanning your environment for danger cues, many of which are passive and subtle. Harsh fluorescent lighting, loud sudden sounds, crowded spaces, unpleasant smells: these all send danger signals to your system, even though they're not literally life-threatening."
   },
   {
    "p": "Creating environmental safety can look like:"
   },
   {
    "ul": [
     "Reducing unnecessary noise and harsh lighting",
     "Creating physical space that feels calm and contained",
     "Choosing sensory input mindfully (soft textures, gentle scents, chosen music, or silence)",
     "Setting up a Passive Safety Environment in your home where you can retreat (Stage 2 of the Unstucking Pathway covers this, if you're a student in the [Unstucking Academy](https://www.stucknotbroken.com/checkout/co-regulator))"
    ]
   },
   {
    "p": "Of course, environmental safety will look different for each of us. If your system is typically flavored by shutdown, you will likely feel more safety with quiet or calm music. Whereas someone with flight/fight may lean into music that is more energized and loud."
   },
   {
    "p": "These environmental conditions aren't luxuries. They're biological necessities for accessing your safety pathways."
   },
   {
    "h3": "Condition 2: interpersonal safety"
   },
   {
    "p": "Again, literal safety comes first: freedom from harm from others. But interpersonal safety also means receiving co-regulative cues of safety from people in your life."
   },
   {
    "p": "Co-regulative cues include:"
   },
   {
    "ul": [
     "Real smiles and eye contact",
     "Warm vocal tones",
     "Calm physical presence",
     "Consistent, reliable behavior",
     "Emotional attunement (empathy)"
    ]
   },
   {
    "p": "This is why connection matters so much in healing. When another person's ventral vagal system is active and regulated, it can help activate yours. It's literally contagious."
   },
   {
    "h3": "Condition 3: practice (the one most people miss)"
   },
   {
    "p": "Here's where people get stuck: they access safety once or twice, then wonder why they can't stay there."
   },
   {
    "p": "The <b>ventral vagal pathways may be underdeveloped in traumatized individuals</b>, especially those living with C-PTSD. They're like muscles that haven't been exercised. Even when you do access safety, it might feel unfamiliar, uncomfortable, or even scary. Trust and vulnerability can feel dangerous when your system has learned that danger is what keeps you alive."
   },
   {
    "p": "This is why practice is essential. You don't just access safety once. You return to it again and again. Each time, you're strengthening those pathways. You're building capacity. You're teaching your system that safety is sustainable."
   },
   {
    "callout": "practice-rise"
   },
   {
    "h": "Building Polyvagal safety: strengthening your vagal brake"
   },
   {
    "p": "Polyvagal safety is not something you \"use\" or \"turn on.\" It's something you develop over time through consistent practice."
   },
   {
    "p": "As you practice accessing safety, you're building the strength of your <b>vagal brake</b>. This Polyvagal concept refers to the social engagement system's influence on your heart rate and nervous system activation. Your vagal brake keeps your heartbeat at a calmer, more contained pace. When it's off, your heart rate increases significantly, increasing sympathetic activation."
   },
   {
    "p": "A strong vagal brake means:"
   },
   {
    "ul": [
     "Your heart rate stays calmer under stress",
     "You recover faster from defensive activation",
     "You have greater distress tolerance (the ability to experience difficult emotions without becoming dysregulated)",
     "You can remain in connection even when challenged"
    ]
   },
   {
    "p": "This is key. The stronger your vagal brake, the more resilient you become. The more you can move through life without getting stuck in defensive states."
   },
   {
    "callout": "comeback"
   },
   {
    "h": "Two approaches to building safety: passive and active"
   },
   {
    "p": "Think of building Polyvagal safety like building a house. You start with the foundation (passive safety cues), then add the structure and livability (active safety practices)."
   },
   {
    "h3": "Passive safety cues: starting with your environment"
   },
   {
    "p": "The first step is creating environmental conditions that support safety without requiring effort:"
   },
   {
    "ul": [
     "Soft lighting (lamps instead of harsh overhead lights; consider dimmer switches)",
     "Fewer sudden sounds (turn off notifications; create quiet space)",
     "Comfortable textures (soft blankets, silk scarves, weighted blankets)",
     "Pleasant scents (lavender, chamomile; use what feels calming to you)",
     "Organized, uncluttered spaces that feel contained"
    ]
   },
   {
    "p": "These are the passive cues. You set them up once, and they keep working for you in the background, bringing in a bit of safety every time you're in this space."
   },
   {
    "p": "Don't worry about creating the perfect home. Pick one room. Or one corner. And don't worry about creating the perfect Passive Safety Environment. Just focus on one or two elements per day, like:"
   },
   {
    "ul": [
     "Adding an element of nature, even a fake one",
     "Decluttering a surface",
     "Vacuuming",
     "Opening the blinds"
    ]
   },
   {
    "h3": "Active safety practices: exercises that strengthen your pathways"
   },
   {
    "p": "Once your environment supports safety, you can layer in active practices: intentional activities that exercise your ventral vagal system."
   },
   {
    "p": "<b>Extended exhales:</b> Slow breathing with a longer exhale (4 to 6 seconds) activates your parasympathetic nervous system. This is one of the fastest ways to shift toward safety."
   },
   {
    "p": "<b>Mindful sensory enjoyment:</b> Slowly eat a blueberry. Really taste it. Notice the texture, the flavor, the sensation. This grounds you in present-moment safety and sensory awareness."
   },
   {
    "p": "<b>Gentle movement:</b> Slow walks, gentle stretching, or slow-paced yoga activate your system in a regulated way, without the activation of intense exercise. Be mindful while doing these things; don't just move around."
   },
   {
    "p": "<b>Social connection:</b> Spend time with people who can co-regulate; people you feel safe around. Let yourself receive their co-regulative cues. You can tell because you actually want to be around them! Even people in the virtual environment can co-regulate."
   },
   {
    "p": "The key is doing these practices from a place of grounded awareness, not from a place of trying to \"fix\" yourself. You're not forcing safety. You're practicing accessing it."
   },
   {
    "practice": "mindfulness",
    "why": "Mindful attention to your senses exercises your safety pathways. This practice keeps it simple."
   },
   {
    "h": "Recognizing your Polyvagal safety state: how do you know you're there?"
   },
   {
    "p": "One question I hear often: \"How do I know if I'm actually in my safety state?\""
   },
   {
    "p": "Here are some signs of being in your Polyvagal ventral safety state:"
   },
   {
    "p": "<b>Physical sensations:</b>"
   },
   {
    "ul": [
     "Relaxed shoulders and jaw",
     "Calm breathing into the belly",
     "Warmth in your chest or belly",
     "A sense of ease or groundedness in your body"
    ]
   },
   {
    "p": "<b>Emotional experience:</b>"
   },
   {
    "ul": [
     "Calm curiosity instead of fear or urgency",
     "Ability to feel your feelings without being overwhelmed",
     "A sense of connection (even if you're alone)",
     "Openness to possibility",
     "Curiosity about the internal world, even the uncomfortable"
    ]
   },
   {
    "p": "<b>Behavioral capacity:</b>"
   },
   {
    "ul": [
     "You can make real eye contact",
     "You can smile for real",
     "You're able to listen and be present with others",
     "You can access play, creativity, motivation, productivity or gentle stillness"
    ]
   },
   {
    "p": "Polyvagal safety can feel peaceful. Grounded. Connected. It can also be energized and fun. <b>No matter how much energy is in the system, the common theme to identify safety is <i>connection</i>.</b> If you're able to connect with the environment, others, or yourself, you have some level of safety."
   },
   {
    "p": "It's difficult for those who live with higher levels of defense in the system."
   },
   {
    "p": "That's normal. That's your system learning something new."
   },
   {
    "callout": "time:safety"
   },
   {
    "h": "Challenges in accessing and maintaining Polyvagal safety"
   },
   {
    "p": "Accessing Polyvagal safety isn't as simple as \"just relax.\" Here's why:"
   },
   {
    "p": "<b>Your past trauma context:</b> If you've experienced life contexts leading to a stuck defensive state (\"trauma\"), your nervous system has learned that danger is everywhere. Or, it's learned to associate danger with specific stimuli. Your system developed strong defensive pathways for a reason: they kept you alive. Now those pathways are automatic, and your ventral vagal pathways may be underdeveloped. Strengthening the safety pathways takes time and consistent practice."
   },
   {
    "p": "<b>Your current environment:</b> If you're still in unsafe circumstances, whether that's an unsafe relationship, an unsafe living situation, or chronic stress, your nervous system is doing exactly what it should: keeping you in defensive mode. You can't think or meditate your way out of this. Real safety comes first."
   },
   {
    "p": "<b>The discomfort of safety:</b> Paradoxically, feeling safe can feel unsafe when your system isn't used to it. Trust, vulnerability, and peace might trigger alarm bells in your nervous system. This is why practice is so important. You're slowly building a new relationship with safety."
   },
   {
    "p": "<b>Larger contexts:</b> On top of the above, humans tend to create larger social structures that keep each other in stuck defense. These larger contexts span from the family to culture to religious and political."
   },
   {
    "h": "You're not broken. You're protected."
   },
   {
    "p": "If you're struggling to access Polyvagal safety, your nervous system isn't broken. It's protecting you. Your biology is doing precisely what it learned to do."
   },
   {
    "p": "The path forward isn't about \"fixing\" yourself. It's about slowly, gently building new pathways. It's about creating the conditions, environmental and interpersonal, where safety becomes possible. It's about practicing, again and again, until your system learns that safety is sustainable."
   },
   {
    "p": "This is the slow, gentle path to healing. And it works."
   }
  ]
 },
 {
  "id": "dorsal-vagal-shutdown",
  "title": "Dorsal vagal shutdown: symptoms, how long it lasts, and the way out",
  "state": "shutdown",
  "groups": [
   "shutdown",
   "found"
  ],
  "minutes": 18,
  "source": "stucknotbroken.com/c/blog/understanding-dorsal-vagal-shutdown",
  "blocks": [
   {
    "p": "<b>Dorsal vagal shutdown is a biological defense mechanism, not a character flaw. It is a physiological state of collapse where your nervous system slows down body functions to conserve energy in the face of overwhelming stress.</b>"
   },
   {
    "p": "If you feel numb, disconnected, or low energy, you are likely not \"lazy\" or \"broken.\" Your body is simply in an ancient survival mode designed to keep you safe."
   },
   {
    "h": "Understanding dorsal vagal shutdown"
   },
   {
    "p": "In the Polyvagal Theory, <b>dorsal vagal shutdown</b> is the body's primitive immobilization response. It occurs when the autonomic nervous system perceives an inescapable threat and shuts down metabolic activity to mimic death."
   },
   {
    "p": "The ANS regulates many of the body's automatic functions, such as heart rate, breathing, and digestion. Basically, it regulates all the stuff we don't have to think about."
   },
   {
    "p": "According to Stephen Porges' Polyvagal Theory, the ANS has three main branches with three primary states the body can exist in. The three primary states of the body are:"
   },
   {
    "ul": [
     "<b>safety and social engagement</b>, regulated by the ventral vagal branch",
     "<b>flight and fight mobility</b>, regulated by the sympathetic branch",
     "<b>shutdown immobility</b>, regulated by the dorsal vagal branch"
    ]
   },
   {
    "p": "When the body is exposed to danger, the ANS shifts out of the safety state, the sympathetic flight/fight state is activated, and the body prepares to fight or flee. However, when the stress is too intense or prolonged, the body may shift into a dorsal vagal shutdown, a protective response that helps the body conserve energy and resources."
   },
   {
    "p": "In the shutdown state, the body's functions slow significantly, <b>an evolutionary attempt to appear dead</b>. Heart rate and breathing slow down, digestion is inhibited, and the body may feel numb or disconnected."
   },
   {
    "h": "My nervous system is shutting down: the everyday version"
   },
   {
    "p": "Your body shutting down and a dorsal vagal shutdown are the same thing. The first is what you already know you're going through. The second is the biological basis for it."
   },
   {
    "p": "If it feels like the world is a grey fog and getting off the couch is a huge ask you don't have the energy for, that might be the lived experience of a dorsal vagal shutdown biological state."
   },
   {
    "callout": "share:shutdown"
   },
   {
    "h": "Causes of dorsal vagal shutdown"
   },
   {
    "p": "Various stressors, including physical trauma, emotional trauma, chronic stress, and illness, can trigger dorsal vagal shutdown."
   },
   {
    "p": "<b>Any situation that overwhelms the body's ability to cope can lead to dorsal vagal shutdown.</b>"
   },
   {
    "p": "For example, a car accident, a natural disaster, or a physical assault can all trigger this response. Similarly, ongoing stressors such as financial problems, relationship issues, or work-related stress can lead to a dorsal vagal shutdown."
   },
   {
    "p": "Of course, there are different presentations and symptoms of shutdown, which I will discuss in the next section. Chronically existing in a shutdown state won't be the same experience as entering shutdown in a life-threatening instance."
   },
   {
    "p": "In addition to external stressors, internal factors can contribute to dorsal vagal shutdown. For example, chronic pain, illness, or inflammation can activate the body's stress response, eventually triggering or contributing to a dorsal vagal shutdown. Similarly, unresolved emotional issues such as past trauma or grief can also contribute to this response."
   },
   {
    "p": "So yes, your body can shut down from stress. It doesn't take one catastrophic event. Enough pressure for long enough without a clear ending can move your system into a shutdown conservation state."
   },
   {
    "h": "Symptoms of dorsal vagal shutdown"
   },
   {
    "p": "Dorsal vagal shutdown can show up in various ways, depending on the individual and the situation. Shutdown can outwardly look obvious, but it can also be more hidden and difficult to detect."
   },
   {
    "p": "Outwardly, in a moment of life threat, someone in a dorsal vagal shutdown will physically collapse and go limp. The evolutionary benefit is to mimic death, allowing a predator to ignore the organism and instead focus on another prey."
   },
   {
    "p": "But a shutdown triggered by ongoing stress is more difficult to detect. A shutdown can appear in a handful of recognizable ways."
   },
   {
    "h3": "Numbness and dissociation"
   },
   {
    "p": "Feelings flatten out. Not sadness exactly, more like the volume got turned down on everything at once, the good along with the bad. You might catch yourself watching from a slight distance, going through a conversation while some part of you is elsewhere. Time can get strange, too, with stretches of a day you can't really account for afterward."
   },
   {
    "p": "Polyvagal theory reads this numbness as dissociation and frames it as protection, not malfunction. In a 2023 paper on how people survive life-threatening situations, Porges and colleagues put it plainly:"
   },
   {
    "q": "\"From the polyvagal perspective, dissociation is viewed as an unconscious process that serves as a protective buffer when a threat is imminent.\""
   },
   {
    "h3": "Feeling disconnected from people"
   },
   {
    "p": "The people you care about are still right there, and you still <i>know</i> you love them. The felt sense of being with them is what's missing. Conversations happen through glass. From the outside, it can look like you've stopped caring, when what's happened is that your system has stopped accepting and giving connection."
   },
   {
    "h3": "Low energy and fatigue that rest doesn't fix"
   },
   {
    "p": "You can sleep a full night or a full weekend and wake up just as heavy and tired. This isn't the tiredness that follows a stressful work week. Your system is running a conservation program, holding energy back on purpose, and sleep doesn't switch that off. Small tasks can sit undone for days, not because you decided against them but because starting never quite becomes possible."
   },
   {
    "h3": "A slowed heart rate and shallow breathing"
   },
   {
    "p": "The body downshifts. Heart rate drops, breathing goes shallow and high in the chest, and your hands and feet may turn cold as blood pulls in toward the core. In a deep enough drop, you can feel lightheaded or close to fainting."
   },
   {
    "p": "Shutdown may be the biological undercurrent of a vasovagal faint, described in the medical literature as:"
   },
   {
    "q": "\"a feeling of lightheadedness. Feelings of warmth and nausea are common. Many patients describe tunnel vision, ringing in their ears, and profuse sweating,\""
   },
   {
    "p": "with the person going \"bradycardic, hypotensive, pale, and diaphoretic\": slowed heart rate, dropped blood pressure, pale and clammy. Same machinery, milder setting."
   },
   {
    "h3": "Digestive problems and nausea"
   },
   {
    "p": "Digestion quiets down when the body drops into conservation mode. Your appetite disappears, or there's constipation, or a stomach that sits knotted with no clear cause."
   },
   {
    "p": "These symptoms can be distressing and interfere with daily functioning, making it difficult to work, socialize, or take care of yourself."
   },
   {
    "callout": "time:shutdown"
   },
   {
    "h": "Dorsal vagal collapse: when shutdown goes all the way down"
   },
   {
    "p": "<i>Collapse</i> is the potential severe experience of a dorsal vagal shutdown. This is beyond the daily background numbness and lack of motivation. It's not a separate condition, but the deepest end of the shutdown spectrum."
   },
   {
    "p": "In a collapse, the dorsal branch of the vagus nerve pulls the system down hard and fast. Blood pressure drops. The muscles give out. Some people faint. It may have a lot to do with a vasovagal syncope experience."
   },
   {
    "p": "The collapse evolved within us to help survive. It's what helps an organism appear dead to a predator. It's what helps that same organism prepare for a more peaceful, painless, disconnected death."
   },
   {
    "p": "But typically, people stuck in shutdown live with the day-to-day, less obvious version of shutdown."
   },
   {
    "h3": "The experience of chronic dorsal vagal shutdown"
   },
   {
    "p": "Clients consistently describe their dorsal vagal shutdown in similar ways."
   },
   {
    "p": "Their lived experience is like being all alone in a dark room. They say they are lying down on the floor of the dark room, limp and without energy. They often describe the dark room as a black, endless void without walls. The feeling of aloneness and the lack of energy permeate."
   },
   {
    "p": "The dark room description is one possible experience in a chronic dorsal vagal shutdown. Yes, it probably sounds like depression. The Polyvagal Theory hypothesizes that being stuck in a shutdown autonomic state may underlie depression."
   },
   {
    "h": "How long does dorsal vagal shutdown last?"
   },
   {
    "p": "Dorsal vagal shutdown can present very differently depending on whether it's a brief response to immediate danger or a prolonged state from ongoing stress or danger."
   },
   {
    "p": "It depends entirely on which kind you're in, and the range is wide."
   },
   {
    "p": "<b>An acute shutdown</b> is usually minutes to hours. Something overwhelms the system, the body drops, and once the threat passes it comes back up on its own."
   },
   {
    "p": "<b>A chronic shutdown</b> is different. It can last weeks, months, or years, and it doesn't resolve on its own the way the acute kind does, because nothing has signalled to your system that the danger is over."
   },
   {
    "p": "So, duration is not what determines whether you come out of it or not. What matters is whether or not your system starts to get enough signals of safety to begin to shift out of shutdown. Not just start, but also sustain the shift out of shutdown. The system tends to fall back to its baseline of shutdown, but over time, it can move out of it more and more, little by little."
   },
   {
    "callout": "eased:shutdown"
   },
   {
    "h3": "Acute dorsal vagal shutdown"
   },
   {
    "p": "Acute shutdown happens in response to a specific, life-threatening event. Your body perceives an inescapable threat and enters a protective collapse state."
   },
   {
    "p": "What it looks like:"
   },
   {
    "ul": [
     "Sudden physical collapse or immobilization",
     "Rapid drop in heart rate and blood pressure",
     "Possible fainting or loss of consciousness",
     "Numbness to pain",
     "May last minutes to a few hours"
    ]
   },
   {
    "p": "<b>Example:</b> A person who passes out on a rollercoaster."
   },
   {
    "p": "<b>Recovery:</b> Acute shutdown typically resolves naturally once the threat passes, especially if the person receives support and can process the experience."
   },
   {
    "h3": "Chronic dorsal vagal shutdown"
   },
   {
    "p": "Chronic shutdown develops from prolonged stress, repeated traumatic incidents, and chronic disruptions of safe connection with others."
   },
   {
    "p": "What chronic shutdown looks like:"
   },
   {
    "ul": [
     "Persistent numbness and disconnection",
     "Chronic fatigue that doesn't improve with rest",
     "Difficulty with motivation, decision-making, or engagement",
     "Emotional flatness, difficulty feeling joy, sadness, or other emotions",
     "Social withdrawal",
     "May last weeks, months, or years"
    ]
   },
   {
    "p": "<b>Example:</b> A person in an abusive relationship who gradually becomes more withdrawn, numb, and disconnected over time."
   },
   {
    "p": "<b>Recovery:</b> Chronic shutdown requires intentional, consistent work to rebuild safety cues and gradually re-engage the nervous system. It doesn't resolve on its own, but with proper support, recovery is absolutely possible."
   },
   {
    "h3": "The key difference between acute and chronic shutdown"
   },
   {
    "p": "The primary difference is <b>duration and origin</b>. Acute shutdown is a brief response to immediate danger. Chronic shutdown is a prolonged state that develops when the nervous system learns to stay protective because safety is unreachable."
   },
   {
    "p": "Both are survival mechanisms, but chronic shutdown requires more intentional support to resolve."
   },
   {
    "h": "The link between trauma and dorsal vagal shutdown"
   },
   {
    "p": "Trauma and dorsal vagal shutdown go hand in hand. To understand this, let's first understand what \"trauma\" is."
   },
   {
    "h3": "What trauma is"
   },
   {
    "p": "Imagine two people sitting in the back seat of a car."
   },
   {
    "p": "A third person is driving and crashes the car head-first into a tree. Both of the backseat passengers have gone through the same basic event. But they may have very different immediate and future reactions to it."
   },
   {
    "ul": [
     "Passenger A may leave that accident, check to ensure safety, and breathe a sigh of relief.",
     "Passenger B, on the other hand, may not. Passenger B may be stuck in a traumatized state and unable to immediately get back to a baseline where they can breathe that sigh of relief. Passenger B may be terrified whenever they get into a car for months, while Passenger A does not feel those effects."
    ]
   },
   {
    "p": "Traumatic events have immediate and long-lasting effects on the state of the autonomic nervous system. In our car crash example, Passengers A and B both probably initially panicked, freezing their entire body and bracing for impact."
   },
   {
    "ul": [
     "Passenger A may have been able to physically leave the crash and self-regulate back into their safety state once the initial danger had passed.",
     "Passenger B may have gotten trapped in the car, and their door was unable to open. Their frozen state did not subside; they remained in that defensive state and could not exit it. On top of that, let's assume that Passenger B was ridiculed for the way their body responded to the event. Or that loved ones in B's life said they did not believe B had been through the accident."
    ]
   },
   {
    "p": "Different people can react differently to similar experiences. Two individuals may have distinct immediate and long-term responses to the same event, just like our passengers."
   },
   {
    "p": "The point: <b>Trauma is not the event</b>. Trauma is the impact of the event. Trauma is also the lack of events, like when a parent does not provide the basics to form a healthy attachment with their child."
   },
   {
    "p": "More specifically: <b>Trauma is being stuck in a defensive state.</b> Trauma is the inability to access the ventral vagal autonomic pathways responsible for safety and social engagement."
   },
   {
    "h": "How dorsal vagal shutdown contributes to trauma"
   },
   {
    "p": "The dorsal vagal shutdown state is one of the ANS' potential defensive states. One can be traumatized and stuck in any of the Polyvagal defensive states. These are all of the Polyvagal defensive states:"
   },
   {
    "ul": [
     "flight/fight",
     "shutdown",
     "freeze"
    ]
   },
   {
    "h3": "Chronic disruption of connectedness: shutdown"
   },
   {
    "p": "My therapy clients often get stuck in a dorsal vagal shutdown state by repeatedly being cut off from safe others. This path of trauma usually results from some form of abuse when one is younger."
   },
   {
    "p": "But being cut off from safe others can also occur in domestic violence situations or hostage situations. These are situations the individual cannot escape or fight. The individual may enter a dorsal vagal shutdown dominant state if these defensive strategies are unsuccessful."
   },
   {
    "h3": "Acute life threat reaction: freeze"
   },
   {
    "p": "But another path of trauma could also lead to dorsal vagal activation: acute life-threat reaction. In this path of trauma, an individual's ANS shifts into flight/fight, but cannot use the impulse to escape or be aggressive. While this individual is in flight/fight, they are also immobilized through force or perception. The immobilization of flight/fight creates a mixed state: freeze."
   },
   {
    "p": "Freeze is the combination of flight/fight and shutdown activation. Sympathetic plus dorsal vagal shutdown. Mobilization plus immobilization. A panic attack is an excellent example of freeze."
   },
   {
    "p": "If someone is immobilized while in flight/fight, they risk being left in a traumatized state. The immobility of dorsal vagal shutdown freezes their flight/fight activation into their system. This activation may remain dormant until triggered by reminders of the trauma's context. Frozen activation could also present itself through flashbacks, panic attacks, or explosive rage."
   },
   {
    "p": "Freeze and shutdown are different, though they both involve immobilization."
   },
   {
    "callout": "freeze-and-shutdown"
   },
   {
    "h": "How to get out of dorsal vagal shutdown"
   },
   {
    "p": "Evolutionarily, it's possible to come out of a dorsal vagal shutdown. This Polyvagal state evolved within us as a survival function. Shutdown is intended to increase the chances of survival in the face of a life-threatening situation by entering an immobile state, conserving the body's resources, and slowing its processes."
   },
   {
    "p": "Wild animals can emerge from a shutdown death feign. They can shift up their Polyvagal ladder into their sympathetic fight state. If they can successfully use their fight energy, they can further climb their ladder into flight and then into their safety state."
   },
   {
    "p": "Shutdown evolved to be a state we enter into and come out of in brief periods of time. However, humans enter shutdown and remain in shutdown. There are many reasons we stay stuck, like things we do to ourselves and things we do to each other."
   },
   {
    "p": "Coming out of a chronic dorsal vagal shutdown is not quick for us. Instead, <b>we need to emerge from shutdown slowly</b>. Our sympathetic flight/fight energy will enter our system as we do so. The return of sympathetic energy can be overwhelming for people, which stops the process and sends them back into shutdown."
   },
   {
    "p": "If you're experiencing resistance to this recovery process, you're not alone. Many people struggle with what I call \"polyvagal resistance\": when your body fights the very healing it needs."
   },
   {
    "p": "We often turn to behavioral adaptations to cope with the discomfort of emerging from shutdown. However, we need to move beyond these behavioral adaptations. And even beyond coping or managing the experiences. Instead, someone in shutdown needs to embrace mindfulness and access their state of safety."
   },
   {
    "h": "Strategies to recover from dorsal vagal shutdown"
   },
   {
    "p": "A dorsal vagal shutdown does not need to be permanent. It is generally possible to live a more connected and fulfilling life."
   },
   {
    "h3": "Co-regulation and connection"
   },
   {
    "p": "I had the pleasure of interviewing Deb Dana, and she gave a beautiful analogy for coming out of shutdown, comparing it to a turtle emerging from its shell."
   },
   {
    "q": "\"To get a turtle to come out of the shell, you don't knock on its shell and you don't shake them... You just kinda sit there patiently... But you really have to be beaming that ventral vagal energy to that system.\""
   },
   {
    "p": "She's saying someone in shutdown cannot be forced out of shutdown. Instead, they need to know it's safe to emerge from the shutdown."
   },
   {
    "p": "\"Knowing\" does not refer to cognitive knowing. It refers to a <b>biological knowing: receiving cues of safety from the external environment through neuroception</b>. Cues of safety from a safe other come through co-regulation. When Deb says we need to \"beam\" safety state cues to someone in shutdown, she means this."
   },
   {
    "p": "So if someone in shutdown can connect with safe others that give them a sense of safety, this can be helpful. However, this can be difficult, especially for someone in shutdown. So the next option might be a better starting point."
   },
   {
    "h3": "Passive safety cues from the environment"
   },
   {
    "p": "I recommend starting with the environment you live in. It's possible to increase the number of safety cues your system detects. Passive safety cues are signals from the environment that are neurocepted as safe. They are cues that bring calm to your body."
   },
   {
    "p": "Everything around you right now is affecting your Polyvagal state. Pieces of your environment, such as:"
   },
   {
    "ul": [
     "lighting",
     "sound",
     "smells",
     "proximity and more"
    ]
   },
   {
    "p": "These and many more passive environmental cues are detected as either more or less safe. For the most part, they're probably benign and don't have a significant impact on your feelings of calm. However, they also <i>could</i> have a significant impact."
   },
   {
    "p": "For example, you may be in an environment that gives you numerous safety cues. But imagine hearing a train blaring its horn outside of your window. This would probably have a significant impact on your level of relaxation and calm."
   },
   {
    "p": "Extreme example, I know. Let's try another one."
   },
   {
    "p": "Imagine having a great environment where you feel safe, like a beach. But then, someone invades your space. Your feelings of safety will lessen depending on your relationship with that person and their proximity to you."
   },
   {
    "p": "<b>The point:</b> Environmental cues like proximity and lighting can affect your access to your safety state."
   },
   {
    "p": "Apply this idea to your home environment. Assess your home and identify which cues give you a stronger sense of safety and which diminish it. It's possible to change your environment to provide more passive safety cues. I call this the Passive Safety Environment: a place you intentionally enhance passive safety within your home. Stage 2 of the Unstucking Pathway in the [Unstucking Academy](https://www.stucknotbroken.com/checkout/co-regulator) covers this in much more detail, with specific steps to create your own."
   },
   {
    "h3": "Mindfully experience the passive safety cues"
   },
   {
    "p": "After setting up more safety cues, the next step is to experience them mindfully. Allow yourself to feel a sense of calm and safety, and experience your connection with your external environment."
   },
   {
    "h3": "Mindfully allow the dorsal vagal shutdown experience while anchored in safety"
   },
   {
    "p": "If you can mindfully connect with your environment, the next step is to allow slight dorsal vagal activation. This is easier than it sounds."
   },
   {
    "p": "In shutdown, the body immobilizes. So allow yourself to immobilize. Allow yourself to be immobile while taking in your passive safety cues mindfully."
   },
   {
    "p": "In shutdown, the environment is typically overwhelming and overstimulating. So listen to this and reduce stimulation. Then experience what it's like to be immobile while safe, with lower stimulation."
   },
   {
    "p": "If you allow yourself to have a mindful experience of your shutdown, then your body's natural capacity to self-regulate can emerge. As you exit shutdown, your flight/fight energy will return to your system."
   },
   {
    "h": "Practical techniques to support your shutdown recovery"
   },
   {
    "p": "While co-regulation and environmental safety cues are foundational, there are specific techniques you can practice to help your nervous system gradually shift out of shutdown. These are not quick fixes. They work best when practiced consistently over time."
   },
   {
    "h3": "Sensory grounding"
   },
   {
    "p": "Grounding techniques reconnect you to the present moment and your body, signaling safety to your nervous system."
   },
   {
    "p": "You've likely heard of or tried the \"5-4-3-2-1 technique,\" which involves naming 5 things you can see, 4 things you can touch, 3 things you can hear, 2 things you can smell, and 1 thing you can taste. This technique is generally fine and a worthwhile practice."
   },
   {
    "p": "However, for someone in shutdown, the full 5-4-3-2-1 technique can feel overwhelming. It sounds simple, I know. But imagine you're collapsed in bed and devoid of motivation or energy. Do you really want to go through each step?"
   },
   {
    "p": "Probably not. (And shutdown clients confirm this.)"
   },
   {
    "p": "<b>Instead, I recommend simplifying further and focusing on <i>one</i> sensory input.</b> Not all 5. Not even 4. <i>Just one.</i>"
   },
   {
    "p": "You can focus much more easily on one sense when you're collapsed in bed. Or out and about doing errands. Or sipping tea and staring out the window. And when you do so, of course, do it <i>mindfully</i>."
   },
   {
    "p": "This simple practice pulls your attention out of the shutdown state and anchors you in your sensory environment."
   },
   {
    "ul": [
     "<b>Sight:</b> Let your eyes gaze out a window and take it all in without specifically focusing on anything. Or, let your eyes take you where they want, drifting from the ground to the window to a crack in the wall.",
     "<b>Touch:</b> Focus on the <i>texture</i> of one held object. Notice its feel, its temperature, and the contours of its shape.",
     "<b>Sound:</b> Listen to soft music, nature sounds, or silence. Less stimulation is better for shutdown.",
     "<b>Smell:</b> Use essential oils, candles, or natural scents (like fresh flowers or citrus) that feel soothing to you. Do so mindfully.",
     "<b>Taste:</b> Slowly savor a piece of dark chocolate, herbal tea, or a piece of fruit. The act of tasting something pleasant can gently activate your system. Focus on the internal experience.",
     "<b>Warmth:</b> A warm bath, shower, or blanket can signal safety and comfort to your nervous system. As always, do so mindfully."
    ]
   },
   {
    "practice": "mindfulness",
    "why": "One sense at a time, mindfully, with nothing to push through. A gentle place to start in shutdown."
   },
   {
    "h3": "Breathing techniques"
   },
   {
    "p": "You've probably experimented with various breathing techniques. There is nothing inherently wrong with various controlled breathing patterns, like extended, belly, box, or others."
   },
   {
    "p": "However, someone in shutdown is more likely to feel overwhelmed with prescriptive breathing. Instead, I recommend making things even simpler."
   },
   {
    "p": "Focus on the body's <i>natural breathing pattern</i>. Your body knows how much oxygen it needs. So, let it work. And pay attention."
   },
   {
    "p": "I've found mindful breathing of natural ins and outs far more powerful than anything else. Clients consistently tell me it's so simple and accessible."
   },
   {
    "p": "As you pay attention, you will likely notice your breathing beginning to shift. Shutdown breath is shallow and into the belly. As one exits shutdown, breath may shift toward the chest and get spontaneously bigger."
   },
   {
    "h3": "Gentle movement"
   },
   {
    "p": "Movement can help your body transition from immobilization to activation. Start <i>very</i> gently. You're not exercising; you're signaling to your nervous system that it's safe to move and embracing emerging sympathetic activation."
   },
   {
    "p": "I don't think there is a certain prescriptive movement for what can help you in particular. You will need to experiment and see what feels best. Likely, the movement that feels right one day will be different the next."
   },
   {
    "p": "Someone in shutdown needs slow, gentle, and small movement. Simply mindfully wiggling toes can work wonders for someone coming out of collapse."
   },
   {
    "p": "Here are some movement ideas to experiment with:"
   },
   {
    "ul": [
     "<b>Rocking or swaying:</b> Sit or stand and gently rock back and forth, or sway side to side. This rhythmic movement is calming and helps your body feel grounded.",
     "<b>Slow walking:</b> A 5 to 10 minute walk at an easy pace, ideally outdoors. Notice the sensation of your feet touching the ground, the air on your skin, the sounds around you.",
     "<b>Stretching:</b> Gentle, slow stretches, not to the point of strain. Focus on areas where you hold tension (shoulders, neck, hips). Move mindfully and notice the sensations.",
     "<b>Finding resistance:</b> This recommendation is more for sympathetic activation returning to the system, which might feel like being on edge or irritable. Find a light weight and focus on the <i>resistance</i> point of the weight and stay there, monitoring your breath and internal sensations."
    ]
   },
   {
    "h3": "Consistency over intensity"
   },
   {
    "p": "The key to these techniques is <i>consistency</i>, not intensity. Practicing one grounding exercise for 2 minutes daily is more effective than doing an intense practice once a week. Your nervous system learns safety through repeated, gentle experiences of calm."
   },
   {
    "p": "Shutdown likes small. So, keep practices small, practical, and actionable. Set realistic mindfulness practices, not lofty goals you'll fall short of."
   },
   {
    "p": "30 seconds of daily mindfulness is better than <i>not</i> doing 30 minutes of meditation, right?"
   },
   {
    "callout": "practice-rise"
   },
   {
    "h": "Seeking professional help for dorsal vagal shutdown"
   },
   {
    "p": "If you're experiencing symptoms of dorsal vagal shutdown, seeking professional help and guidance is important. A mental health professional or other healthcare provider can help you understand the underlying causes of your symptoms and develop a personalized treatment plan to address them. If you need therapy, find a therapist. I recommend a Polyvagal-informed one if you can find one."
   },
   {
    "h": "There is hope in coming out of shutdown"
   },
   {
    "p": "Existing in a chronic dorsal vagal shutdown is tough, I know. Shutdown has been my \"home away from home\" my entire life. It's possible to recover from it, although it's a lengthy process."
   }
  ]
 },
 {
  "id": "flight-fight-state",
  "title": "The flight/fight state",
  "state": "fightflight",
  "groups": [
   "fightflight",
   "found"
  ],
  "minutes": 5,
  "source": "Stuck Not Broken, Book 1 (\"the Flight/Fight State\")",
  "blocks": [
   {
    "p": "Flight and fight are both sympathetic but have unique feelings, behaviors, and overall functioning, so I'll discuss them separately."
   },
   {
    "p": "If we don't have access to the safety state, flight/fight follows as we drop one rung down the Polyvagal ladder. The flight/fight state does exactly what it says it does. This state is responsible for an organism's ability to flee or use aggression when in danger. Like the other states of the autonomic nervous system, these behaviors increase the chances of survival."
   },
   {
    "p": "Specifically, the flight behaviors come before the fight behaviors. We first attempt to avoid or run away from danger. If that is unsuccessful, then we shift into our fight behaviors. Rather than creating space, we decrease space. The evolutionary benefit is to get the danger to back off (fight), creating an opportunity for the potential prey to escape to safety (flight)."
   },
   {
    "p": "Flight and fight both stem from the sympathetic nervous system and have the same immediate biological responses, including:"
   },
   {
    "ul": [
     "higher heart rate",
     "adrenaline release",
     "tense muscles",
     "wider eyes",
     "ears attuned to danger",
     "increased metabolic rate",
     "shorter breaths into the chest and shoulders",
     "increased pain tolerance",
     "better ability to scan for danger"
    ]
   },
   {
    "p": "A moment of actual danger involving the flight/fight system looks and feels different from the day-to-day experience. The sympathetic system evolved to activate for very short periods. The body uses the activated sympathetic energy immediately. It's not supposed to linger in our system day after day. However, it's possible to get stuck in flight/fight, resulting in the feelings below."
   },
   {
    "p": "<b>What flight feels like:</b> anxiety, worry, nervousness, apprehension"
   },
   {
    "p": "<b>What fight feels like:</b> anger, irritability, hostility"
   },
   {
    "callout": "share:fightflight"
   },
   {
    "h": "Danger"
   },
   {
    "p": "In the flight/fight state, reality is experienced through the lens of danger. The world in this state is:"
   },
   {
    "ul": [
     "scary",
     "threatening",
     "out to get me",
     "untrustworthy"
    ]
   },
   {
    "p": "When someone is in a flight or fight state, they may perceive a neutral face as threatening. A face staring blankly due to daydreaming or boredom, without any clear emotion, might be neurocepted as dangerous. Imagine how differently someone in this state experiences and interacts with the world compared to someone in their safety state."
   },
   {
    "h": "What flight/fight looks like"
   },
   {
    "p": "The person stuck in a flight/fight state is more tense, fidgety, evasive, loud, and direct. This person may be perceived as (or is) more rude and socially inappropriate. This person will have difficulty interacting with fellow students or co-workers, seeing threats in their daily interactions. This person is more likely to flee in anxiety or erupt in anger when something goes wrong."
   },
   {
    "p": "Remember: the body is in a mobilized state. It's prepared to run or fight in the face of danger. Someone in this state will show behaviors reflective of mobilization. They may not be overtly obvious, but you can observe subtle cues."
   },
   {
    "p": "One of these is in the breath. When flight/fight is active, breath becomes shorter and faster. It goes quickly into the chest and sometimes the shoulders move up and down. (Compare this to the safety state, where the breath goes lightly into the belly.) As a result of the faster rate of sympathetic breath, the individual will have a quicker rate of speaking and is typically monotone, lacking vocal prosody."
   },
   {
    "p": "In the flight/fight state, we have dropped down the Polyvagal ladder into defense. Now, we create distance from others because we see them as dangerous. Someone in this state will have difficulty with being close physically and emotionally, even with safe others. The more entrenched someone is in their flight/fight state, the more pronounced these difficulties will be."
   },
   {
    "p": "You can recognize someone in a stuck flight/fight state through their face. They will no longer use their facial muscles in the same way as someone in safety. They won't smile, their eyes might be wider, they lack eye crinkles, and their neck won't tilt to the side when they listen."
   },
   {
    "p": "Someone in a lingering flight/fight state will have a diminished ability to hear others accurately. Their inner ear muscles are now attuned to listening for dangerous sounds like high-pitched screams or low-bass sounds like a growl. They may not hear the full range of a loved one's voice or the intention of their words. The individual in flight/fight does not understand sarcasm; they don't identify the humor and neurocept the dead-pan vocal delivery as a threat."
   },
   {
    "p": "Creating connections with others is a significant challenge for someone in a stuck flight/fight state. They perceive others as dangerous and miss their safety cues or misinterpret neutral cues. In flight/fight, physical closeness is difficult, making relationships more challenging. The flight/fight individual avoids interactions with others or is overly domineering. They may connect with others in a similar flight/fight state. Gangs comprise flight/fight individuals who share environmental, racial, and cultural similarities."
   },
   {
    "callout": "time:fightflight"
   },
   {
    "h": "Coming out of flight/fight"
   },
   {
    "p": "Ideally, one uses large bursts of movement to release their flight/fight sympathetic energy. The individual runs away or uses aggression to mitigate danger. Then, they return to safe environments and people in their lives. Ideally. This ideal may not be the reality for you. But it's still possible to exit from this state and climb the autonomic ladder back into the safety state. Not easy, but possible."
   },
   {
    "callout": "eased:fightflight"
   },
   {
    "p": "The way to get back to the safety state is to mindfully attune your conscious awareness to the inner sensations of the stuck flight/fight state. You must be curious (not evaluative and judging) about what it feels like to be in flight/fight, then allow those feelings to be present and experienced directly. The conscious awareness and experience enable the stuck energy to begin getting unstuck."
   },
   {
    "p": "But this can be too much to ask. Before delving into the stuck state, build up the strength of the safety pathways. Building safety pathways means mindfully activating and spending more time in the safety state. Mindfulness helps us notice and experience what it's like to feel safe. It's the means to experience, practice, and build the strength of the safety state."
   },
   {
    "callout": "practice-rise"
   },
   {
    "practice": "anchoring",
    "sense": "movement",
    "why": "Flight/fight energy wants to move. This practice anchors you in safety first, through movement."
   },
   {
    "p": "For now, it may be more helpful to notice when your flight/fight state activates and when it's calmed. What environmental or interpersonal cues are present as flight/fight calms?"
   },
   {
    "h": "Journal"
   },
   {
    "ul": [
     "Name one time from this past week when you felt your flight/fight state active (make this something benign, not serious). How could you tell?",
     "When was the last time you felt irritated? Do you think you were in fight?",
     "When was the last time you felt anxious? Do you think you were in flight?"
    ]
   },
   {
    "h": "From the research"
   },
   {
    "q": "\"Studies have identified areas of the PAG that are organized to regulate flight, fight, or freeze behaviors and the autonomic states that support these behaviors. Stimulating rostrally within the lateral and dorsolateral [periaqueductal gray] produces confrontational defensive behaviors (i.e., fight), while stimulating caudally within the lateral PAG and dorsolateral PAG produces escape behaviors (i.e., flight). Autonomic shifts such as increases in heart rate and blood pressure parallel these behaviors.\" (Porges)"
   },
   {
    "p": "My translation: certain brain areas control autonomic responses resulting in aggressive or evasive behaviors. Our physiology changes when these areas are stimulated."
   }
  ]
 }
];
  // the main insight of a week post (post.lead) -> a topic group (LEARNING-GROUPS.md)
  const INSIGHT_GROUP = { toSafety:'build', steadySafe:'build', toDefense:'hard', stretch:'hard', steadyDef:'feel',
    payoff:'prac', firstBest:'prac', thin:'start', late:'rest', evening:'rest', mixed:'read' };
  // a journal answer (context chip) -> a topic group
  const CHIP_GROUP = { 'work':'work', 'family':'family', 'friends':'rel', 'partner':'rel', 'hobbies':'playcre', 'spiritual':'meaning',
    'nature':'surround', 'body & movement':'body', 'rest':'rest', 'practice':'prac', 'something else':'found' };
  const inGroup = g => g ? PIECES.filter(p => p.groups.indexOf(g) >= 0) : [];
  const byId = id => PIECES.find(p => p.id === id) || null;
  global.Learning = { PIECES, INSIGHT_GROUP, CHIP_GROUP, inGroup, byId };
})(window);
