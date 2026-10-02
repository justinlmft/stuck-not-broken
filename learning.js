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
   Book chapters carry book, book_url (the Circle checkout) and book_amazon; the piece shows both links.
   Blocks: {p} {h} {h3} {ul} {ol} {q} (a quote) {reflect:id, prompt, fill?} (an in-article reflection, saved for paid members) {callout:id} {practice:'anchoring'|'mindfulness'|'custom', sense?, why}.
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
  "desc": "Getting things done but feeling flat and far away? That can be freeze. What it is, and how to come out of it.",
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
  "desc": "Safety is more than feeling calm. What it is in your body, and how to build more of it.",
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
    "callout": "context:places"
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
    "callout": "context:people"
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
    "practice": "anchoring",
    "why": "Safety anchoring is the app's safety practice: it helps you find safety and spend time with it, which is how the pathways get stronger."
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
  "desc": "Heavy, foggy or numb? What shutdown is, how long it can last, and the gentle way out.",
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
    "p": "The body downshifts. Heart rate drops, breathing goes shallow and into the belly, and your hands and feet may turn cold as blood pulls in toward the core. In a deep enough drop, you can feel lightheaded or close to fainting."
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
  "desc": "Anxious or irritable? How flight and fight work, what they feel like, and how to come back to safety.",
  "book": "Stuck Not Broken, Book 1: Trauma & the Polyvagal Paradigm",
  "book_url": "https://www.stucknotbroken.com/checkout/snb1-pdf",
  "book_amazon": "https://www.amazon.com/dp/B0D7SSTJTV",
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
    "reflect": "ff-week",
    "prompt": "Name one time from this past week when you felt your flight/fight state active (make this something benign, not serious). How could you tell?"
   },
   {
    "reflect": "ff-irritated",
    "prompt": "When was the last time you felt irritated? Do you think you were in fight?"
   },
   {
    "reflect": "ff-anxious",
    "prompt": "When was the last time you felt anxious? Do you think you were in flight?"
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
  /* GENERATED PIECES (conv/build_learning.py) */
  const GEN_PIECES = [{"id":"impulses-vs-behavioral-adaptations","title":"Acting on impulses vs. behavioral adaptations: what actually releases trauma","desc":"Doing the \"right\" things and still falling back into the same patterns? The difference between a genuine impulse and a behavioral adaptation, and why safety comes first.","groups":["freeze","body","hard"],"minutes":15,"source":"blog","file":"learn/impulses-vs-behavioral-adaptations.json","state":"freeze","related":["polyvagal-resistance","snb168-impulses-and-trauma-releasing"]},{"id":"depression-polyvagal-theory","title":"Depression and Polyvagal Theory: why you're stuck, not broken","desc":"What gets diagnosed as depression often matches the biology of shutdown. The DSM criteria one by one, through a Polyvagal lens, and what helps.","groups":["shutdown","found","meaning"],"minutes":14,"source":"blog","file":"learn/depression-polyvagal-theory.json","state":"shutdown","related":["reconnect-after-trauma","dorsal-vagal-shutdown"]},{"id":"fawn-response","title":"The fawn response isn't a survival state (it's what you do to survive one)","desc":"Fawning is real, but it isn't a state your body drops into. It's something you do. What it is, what sits under it, and what helps.","groups":["shutdown","feel","rel"],"minutes":13,"source":"blog","file":"learn/fawn-response.json","state":"shutdown","related":["freeze-vs-shutdown","dorsal-vagal-shutdown"]},{"id":"freeze-vs-shutdown","title":"Shutdown vs. freeze: they're not the same state","desc":"One is limp. One is tense. How to tell shutdown and freeze apart, and why each needs something different from you.","groups":["freeze","shutdown","read"],"minutes":6,"source":"blog","file":"learn/freeze-vs-shutdown.json","state":"freeze","related":["functional-freeze","dorsal-vagal-shutdown"]},{"id":"nervous-system-meditation","title":"Nervous system meditation: what it actually is (and a 2-minute practice)","desc":"If meditating winds you up, maybe the instruction was wrong. What meditation looks like at the nervous system level, and a two-minute way to start.","groups":["stillness","prac","start"],"minutes":9,"source":"blog","file":"learn/nervous-system-meditation.json","state":"stillness","related":["snb188-meditation-for-busy-people","snb199-silence-and-mindfulness"]},{"id":"polyvagal-resistance","title":"Why you have resistance to Polyvagal ladder climbing (and what to do about it)","desc":"You know safety would feel better, yet part of you wants to stay put. Why your nervous system resists climbing the ladder, and how to work with it.","groups":["hard","build","body"],"minutes":11,"source":"blog","file":"learn/polyvagal-resistance.json","related":["impulses-vs-behavioral-adaptations","snb170-resistance-to-ladder-climbing"]},{"id":"reconnect-after-trauma","title":"The slow and steady path to healing: how to come out of shutdown and reconnect after trauma","desc":"Coming out of shutdown is possible, slowly. Strengthening safety first, allowing shutdown mindfully, and why irritation can be a good sign.","groups":["shutdown","hard","rel"],"minutes":9,"source":"blog","file":"learn/reconnect-after-trauma.json","state":"shutdown","related":["snb162-possible-to-come-out-of-shutdown","depression-polyvagal-theory"]},{"id":"self-help-habits-that-keep-you-stuck","title":"When self-help keeps you stuck: five habits that backfire on your nervous system","desc":"More doing isn't always the answer. Five common self-help habits that can keep an overwhelmed nervous system stuck, and what to try instead.","groups":["prac","hard","feel"],"minutes":13,"source":"blog","file":"learn/self-help-habits-that-keep-you-stuck.json","related":["somatic-self-regulation","snb279-five-self-help-habits"]},{"id":"somatic-self-regulation","title":"Somatic self-regulation: a daily practice, not a protocol","desc":"Not a hack, a reset or a seven-day challenge. What somatic self-regulation is, three skills it starts with, and how to begin with thirty seconds a day.","groups":["prac","body","start"],"minutes":12,"source":"blog","file":"learn/somatic-self-regulation.json","related":["self-help-habits-that-keep-you-stuck","nervous-system-meditation"]},{"id":"spouse-is-stuck-in-shutdown","title":"When your spouse is stuck in shutdown and lashing out: self-regulation, boundaries, and support","desc":"Shut down for weeks, then a burst of anger, then back again. How to help someone you love who is stuck in a defensive state, starting with your own regulation.","groups":["shutdown","rel","family"],"minutes":12,"source":"blog","file":"learn/spouse-is-stuck-in-shutdown.json","state":"shutdown","related":["snb282-partner-in-shutdown","reconnect-after-trauma"]},{"id":"therapy-retraumatization","title":"Retraumatization in therapy: the hidden risk and how your biology protects you","desc":"Ever left a session feeling worse than when you walked in? Two ways therapy can retraumatize, the red flags, and why safety comes first.","groups":["hard","prac","build"],"minutes":14,"source":"blog","file":"learn/therapy-retraumatization.json","related":["snb267-drained-after-therapy","snb264-safety-first-trauma-exercises"]},{"id":"uncontrollable-shaking-when-crying","title":"Uncontrollable shaking when crying: a Polyvagal Theory and nervous system explanation","desc":"When crying turns into full-body shaking, your nervous system is doing what it's built to do. Why it happens, and how to support yourself through it.","groups":["freeze","body","feel"],"minutes":12,"source":"blog","file":"learn/uncontrollable-shaking-when-crying.json","state":"freeze","related":["snb216-crying-in-trauma-recovery","snb243-crying-release-panic-rage"]},{"id":"snb287-functional-freeze","title":"Functional freeze, and how to start coming out of it","desc":"You're getting things done. You're showing up, you're answering texts, you're making dinner.","groups":["freeze","rest","prac"],"minutes":9,"source":"podcast","file":"learn/snb287-functional-freeze.json","state":"freeze","episode":287,"related":["snb233-thawing-freeze-gently"]},{"id":"snb283-polyvagal-bandwagon","title":"Why the polyvagal bandwagon emptying is a good thing","desc":"I love the Polyvagal Theory. I love it. It has answered so many questions for me, personally and professionally as a therapist and coach.","groups":["found"],"minutes":25,"source":"podcast","file":"learn/snb283-polyvagal-bandwagon.json","episode":283,"related":["snb280-polyvagal-theory-not-dead"]},{"id":"snb282-partner-in-shutdown","title":"When your partner is in shutdown","desc":"I spend a lot of time talking about shutdown: how to recognize it, work with it, and even move through it.","groups":["shutdown","rel"],"minutes":17,"source":"podcast","file":"learn/snb282-partner-in-shutdown.json","state":"shutdown","episode":282,"related":["snb271-shutdown-and-fight-cycle"]},{"id":"snb281-emdr-beyond-eye-movements","title":"What actually helps in EMDR","desc":"EMDR is a very popular treatment option for pretty much everything at this point, though it began as a treatment for trauma.","groups":["safety","prac","found"],"minutes":14,"source":"podcast","file":"learn/snb281-emdr-beyond-eye-movements.json","state":"safety","episode":281,"related":["snb267-drained-after-therapy"]},{"id":"snb280-polyvagal-theory-not-dead","title":"Why the Polyvagal Theory is not dead","desc":"Despite what you may have heard recently, no, the Polyvagal Theory is not dead.","groups":["freeze","found"],"minutes":15,"source":"podcast","file":"learn/snb280-polyvagal-theory-not-dead.json","state":"freeze","episode":280,"related":["snb283-polyvagal-bandwagon"]},{"id":"snb279-five-self-help-habits","title":"Five self-help habits that can keep you stuck","desc":"The self-help industry sells doing as the cure: more habits, more discipline, more effort. And that makes sense.","groups":["fightflight","prac","build"],"minutes":13,"source":"podcast","file":"learn/snb279-five-self-help-habits.json","state":"fightflight","episode":279,"related":["snb264-safety-first-trauma-exercises"]},{"id":"snb278-capacity-before-the-past","title":"Build capacity before you process the past","desc":"Stop trying to force yourself to revisit the most painful moments of your life before you have the skills and the capacity to handle them.","groups":["safety","build","prac"],"minutes":12,"source":"podcast","file":"learn/snb278-capacity-before-the-past.json","state":"safety","episode":278,"related":["snb281-emdr-beyond-eye-movements"]},{"id":"snb277-meditation-and-freeze","title":"When meditation makes freeze feel worse","desc":"If meditation and breathing exercises make you more anxious, you're not broken. Your nervous system is potentially telling you something important.","groups":["freeze","prac","build"],"minutes":11,"source":"podcast","file":"learn/snb277-meditation-and-freeze.json","state":"freeze","episode":277,"related":["snb287-functional-freeze"]},{"id":"snb276-rethinking-diagnosis","title":"What a diagnosis can and can't tell you","desc":"I have a mixed bag of feelings and thoughts around mental health diagnoses.","groups":["shutdown","prac","feel"],"minutes":16,"source":"podcast","file":"learn/snb276-rethinking-diagnosis.json","state":"shutdown","episode":276,"related":["snb149-its-just-you-1-no-ego-no-shadow-no-parts"]},{"id":"snb275-steadying-the-waters","title":"Steadying the water, Stoicism and your nervous system","desc":"This one brings in another passion of mine, outside of but connected to mental health and the nervous system: philosophy, particularly Stoic philosophy.","groups":["safety","prac","feel"],"minutes":14,"source":"podcast","file":"learn/snb275-steadying-the-waters.json","state":"safety","episode":275,"related":["snb259-stop-trying-to-change-your-state"]},{"id":"snb274-sockless-mindfulness","title":"Sockless mindfulness","desc":"There's more to me than the Polyvagal Theory and mental health. I love doing this stuff, but there's more to me. I'm a dad.","groups":["prac","family"],"minutes":3,"source":"podcast","file":"learn/snb274-sockless-mindfulness.json","episode":274,"related":["snb272-hit-it-back"]},{"id":"snb273-still-affects-you","title":"The past still affects you, even when you don't think about it","desc":"\"That was a long time ago. I don't think it affects me anymore. I don't even think about it.\"","groups":["shutdown","feel","prac"],"minutes":6,"source":"podcast","file":"learn/snb273-still-affects-you.json","state":"shutdown","episode":273,"related":["snb278-capacity-before-the-past"]},{"id":"snb272-hit-it-back","title":"Hit it back: a lesson in playfulness","desc":"My little family and I were in San Jose, California, for a huge family get-together, almost a reunion.","groups":["play","playcre","family"],"minutes":4,"source":"podcast","file":"learn/snb272-hit-it-back.json","state":"play","episode":272,"related":["snb274-sockless-mindfulness"]},{"id":"snb271-shutdown-and-fight-cycle","title":"When your partner cycles between shutdown and fight","desc":"When your spouse is dysregulated and shut down, and then lashes out in anger, what's happening, and what can you do about it?","groups":["shutdown","rel"],"minutes":19,"source":"podcast","file":"learn/snb271-shutdown-and-fight-cycle.json","state":"shutdown","episode":271,"related":["snb282-partner-in-shutdown"]},{"id":"snb270-ai-therapists","title":"Can AI replace your therapist?","desc":"Back in what feels like the ancient history of 2023, I released an episode called \"Can AI Replace Your Therapist?\" The short answer then was no.","groups":["safety","prac","found"],"minutes":17,"source":"podcast","file":"learn/snb270-ai-therapists.json","state":"safety","episode":270,"related":["snb194-polyvagal-therapist"]},{"id":"snb268-pendulation-naturally","title":"Pendulation, and why some people regulate naturally","desc":"Is pendulation always a conscious effort, or do some people just do it naturally? And what does that mean for those who are in a stuck state?","groups":["safety","prac","build"],"minutes":9,"source":"podcast","file":"learn/snb268-pendulation-naturally.json","state":"safety","episode":268,"related":["snb265-shame-anger-pendulation"]},{"id":"snb267-drained-after-therapy","title":"Why you feel drained after therapy, and how to avoid it","desc":"Have you ever felt drained after therapy? I'll bet you have. I'll share my thoughts on why that is, and also how to avoid feeling drained from therapy.","groups":["safety","prac","build"],"minutes":9,"source":"podcast","file":"learn/snb267-drained-after-therapy.json","state":"safety","episode":267,"related":["snb278-capacity-before-the-past"]},{"id":"snb266-emotions-and-body-state","title":"A different way to understand and work with your emotions","desc":"I think the way you understand and manage your emotions is wrong.","groups":["safety","feel","prac"],"minutes":11,"source":"podcast","file":"learn/snb266-emotions-and-body-state.json","state":"safety","episode":266,"related":["snb154-ssiec-state-sensation-impulse-emotion-cognition"]},{"id":"snb265-shame-anger-pendulation","title":"Shame, anger, and why pendulation starts with safety","desc":"I got a question from a listener named Katie that I want to address. It's about shame and anger, and how to deal with them in a polyvagal-informed way.","groups":["safety","feel","prac"],"minutes":12,"source":"podcast","file":"learn/snb265-shame-anger-pendulation.json","state":"safety","episode":265,"related":["snb268-pendulation-naturally"]},{"id":"snb264-safety-first-trauma-exercises","title":"Why prescribed trauma exercises can backfire, and why safety comes first","desc":"I got a question from someone on YouTube who left it in the comments, and I want to address it here.","groups":["safety","prac"],"minutes":10,"source":"podcast","file":"learn/snb264-safety-first-trauma-exercises.json","state":"safety","episode":264,"related":["snb278-capacity-before-the-past"]},{"id":"snb263-let-your-body-breathe","title":"Breath and self-regulation: let your body breathe","desc":"I got a question on YouTube asking how to use breath when working through this stuff.","groups":["safety","body","prac"],"minutes":4,"source":"podcast","file":"learn/snb263-let-your-body-breathe.json","state":"safety","episode":263,"related":["snb259-stop-trying-to-change-your-state"]},{"id":"snb262-three-ways-through-overwhelm","title":"Three ways to get things done when you're overwhelmed","desc":"Do you feel like you're drowning in to-do lists? Of course you do. We all do.","groups":["safety","feel","prac"],"minutes":20,"source":"podcast","file":"learn/snb262-three-ways-through-overwhelm.json","state":"safety","episode":262,"related":["snb245-states-and-productivity"]},{"id":"snb261-boundaries-safety-and-fight","title":"Why boundaries need both safety and fight","desc":"What does the ventral vagal safety state have to do with setting boundaries?","groups":["safety","rel","prac"],"minutes":7,"source":"podcast","file":"learn/snb261-boundaries-safety-and-fight.json","state":"safety","episode":261,"related":["snb133-behavior-not-toxicity"]},{"id":"snb260-fawn-and-appease","title":"Fawn and appease as adaptations to shutdown","desc":"I always ground my thoughts in the Polyvagal Theory primary source teachings.","groups":["shutdown","found","prac"],"minutes":9,"source":"podcast","file":"learn/snb260-fawn-and-appease.json","state":"shutdown","episode":260,"related":["snb155-fawning-and-distress-tolerance"]},{"id":"snb259-stop-trying-to-change-your-state","title":"Stop trying to change your state, and listen to your body instead","desc":"We all search for that sense of inner balance, don't we?","groups":["shutdown","body","prac"],"minutes":11,"source":"podcast","file":"learn/snb259-stop-trying-to-change-your-state.json","state":"shutdown","episode":259,"related":["snb263-let-your-body-breathe"]},{"id":"snb257-rebuilding-after-a-breakup","title":"Rebuilding after a breakup, starting with safety","desc":"I got a message from a listener. We'll call him Chuck. He wrote:","groups":["freeze","rel","feel"],"minutes":15,"source":"podcast","file":"learn/snb257-rebuilding-after-a-breakup.json","state":"freeze","episode":257,"related":["snb131-isolation-keeps-you-stuck"]},{"id":"snb252-noticing-neuroception","title":"How to notice neuroception in daily life","desc":"You learned the Polyvagal Theory. Now what? How do you apply this knowledge to your everyday life?","groups":["safety","read","prac"],"minutes":12,"source":"podcast","file":"learn/snb252-noticing-neuroception.json","state":"safety","episode":252,"related":["snb207-polyvagal-algorithm"]},{"id":"snb251-validate-and-normalize-yourself","title":"How to validate and normalize yourself","desc":"You know the Polyvagal Theory. Now what? How do you apply this knowledge to your specific, everyday life?","groups":["shutdown","feel","prac"],"minutes":15,"source":"podcast","file":"learn/snb251-validate-and-normalize-yourself.json","state":"shutdown","episode":251,"related":["snb237-validating-maria"]},{"id":"snb250-passive-safety-cues","title":"Increase safety through passive cues","desc":"You've probably learned about the Polyvagal Theory, how your nervous system shifts between safety, flight, fight, and shutdown.","groups":["safety","build","surround"],"minutes":10,"source":"podcast","file":"learn/snb250-passive-safety-cues.json","state":"safety","episode":250,"related":["snb148-active-passive-cues-and-context"]},{"id":"snb249-identify-your-autonomic-state","title":"Identify your autonomic state in nine questions","desc":"By now, you've probably learned about the Polyvagal Theory: how your nervous system shifts between safety, flight, fight, and shutdown.","groups":["safety","prac","feel"],"minutes":12,"source":"podcast","file":"learn/snb249-identify-your-autonomic-state.json","state":"safety","episode":249,"related":["snb252-noticing-neuroception"]},{"id":"snb248-loved-one-in-shutdown","title":"Recognizing shutdown in someone you love, and how to help","desc":"A dorsal vagal shutdown is one of three primary autonomic states.","groups":["shutdown","rel","family"],"minutes":16,"source":"podcast","file":"learn/snb248-loved-one-in-shutdown.json","state":"shutdown","episode":248,"related":["snb282-partner-in-shutdown"]},{"id":"snb247-shutdown-to-freeze","title":"Coming out of shutdown and finding freeze","desc":"What if you're coming out of shutdown and you find yourself in a new stuck state, a new predicament, which is having more freeze activation?","groups":["shutdown","hard","prac"],"minutes":10,"source":"podcast","file":"learn/snb247-shutdown-to-freeze.json","state":"shutdown","episode":247,"related":["snb233-thawing-freeze-gently"]},{"id":"snb246-anxiety-and-the-cause","title":"Do you need to know what's causing your anxiety?","desc":"I think this might be one of the most common problems I see when I'm working with my clients as a therapist or as a coach: the belief that if we don't know…","groups":["fightflight","feel","prac"],"minutes":9,"source":"podcast","file":"learn/snb246-anxiety-and-the-cause.json","state":"fightflight","episode":246,"related":["snb189-easy-anxiety-management-skills"]},{"id":"snb245-states-and-productivity","title":"Getting things done with your nervous system states","desc":"You're trying to get more done. Maybe you're an artist, or starting a new hobby, or you just want to be more productive at work.","groups":["safety","build","prac"],"minutes":19,"source":"podcast","file":"learn/snb245-states-and-productivity.json","state":"safety","episode":245,"related":["snb262-three-ways-through-overwhelm"]},{"id":"snb244-words-for-shutdown","title":"Words of encouragement from people who know shutdown","desc":"If you're stuck in dorsal vagal shutdown, you probably need to hear a little positivity and encouragement, and not just from me, but from other people who know…","groups":["shutdown","rest","feel"],"minutes":26,"source":"podcast","file":"learn/snb244-words-for-shutdown.json","state":"shutdown","episode":244,"related":["snb208-coming-out-of-shutdown"]},{"id":"snb243-crying-release-panic-rage","title":"Crying, release, panic, and rage","desc":"Where does crying fit on the Polyvagal ladder? It's a question I get, and the short answer is that it doesn't, at least not as a state.","groups":["freeze","feel","prac"],"minutes":7,"source":"podcast","file":"learn/snb243-crying-release-panic-rage.json","state":"freeze","episode":243,"related":["snb216-crying-in-trauma-recovery"]},{"id":"snb242-four-wellness-pathways","title":"Four pathways for your wellness efforts","desc":"You're probably doing a ton of trauma recovery and general wellness kinds of things, and it can get overwhelming.","groups":["safety","prac","build"],"minutes":10,"source":"podcast","file":"learn/snb242-four-wellness-pathways.json","state":"safety","episode":242,"related":["snb176-safety-versus-coping"]},{"id":"snb241-beneath-your-emotions","title":"What you feel, and how you can tell","desc":"One question we don't ask enough is: how do I feel, on an emotional level? Another question we probably never ask is: how can I tell?","groups":["safety","feel","prac"],"minutes":5,"source":"podcast","file":"learn/snb241-beneath-your-emotions.json","state":"safety","episode":241,"related":["snb266-emotions-and-body-state"]},{"id":"snb240-macys-dance","title":"Macy's dance: a real story of moving out of shutdown","desc":"I want to share a story from someone in my community who has a really good example of self-regulation.","groups":["shutdown","prac","body"],"minutes":10,"source":"podcast","file":"learn/snb240-macys-dance.json","state":"shutdown","episode":240,"related":["snb247-shutdown-to-freeze"]},{"id":"snb239-frustration-coming-out-of-shutdown","title":"Why frustration shows up as you come out of shutdown","desc":"You're trying to self-regulate out of shutdown and work your way up the Polyvagal ladder, but you keep stumbling onto frustration, irritation, and maybe even anger.","groups":["shutdown","feel","prac"],"minutes":14,"source":"podcast","file":"learn/snb239-frustration-coming-out-of-shutdown.json","state":"shutdown","episode":239,"related":["snb240-macys-dance"]},{"id":"snb238-shutdown-support-survey","title":"What people in shutdown say actually helps","desc":"So many people are stuck in shutdown, and each of them thinks they're alone. They each think they're different, or that they're hopeless.","groups":["shutdown","prac","rel"],"minutes":13,"source":"podcast","file":"learn/snb238-shutdown-support-survey.json","state":"shutdown","episode":238,"related":["snb227-how-long-shutdown-lasts"]},{"id":"snb237-validating-maria","title":"Practice validation with Maria's story","desc":"I want to help you practice validation. A lot of my clients and community members struggle with it.","groups":["freeze","feel","prac"],"minutes":10,"source":"podcast","file":"learn/snb237-validating-maria.json","state":"freeze","episode":237,"related":["snb251-validate-and-normalize-yourself"]},{"id":"snb236-validating-shutdown","title":"Validating shutdown, the first step out","desc":"At first, my clients and my students predictably invalidate their emotions without even realizing it. And we all do this on some level.","groups":["shutdown","feel","prac"],"minutes":9,"source":"podcast","file":"learn/snb236-validating-shutdown.json","state":"shutdown","episode":236,"related":["snb232-allowing-shutdown"]},{"id":"snb234-safety-when-always-in-defense","title":"How to find safety when you're always in defense","desc":"Maybe you can relate to this.","groups":["safety","prac","rel"],"minutes":24,"source":"podcast","file":"learn/snb234-safety-when-always-in-defense.json","state":"safety","episode":234,"related":["snb197-feeling-stuck-touching-defense-lightly"]},{"id":"snb233-thawing-freeze-gently","title":"Freeze, and how to start thawing it gently","desc":"There's a really good chance you exist in a freeze state.","groups":["freeze","prac","hard"],"minutes":8,"source":"podcast","file":"learn/snb233-thawing-freeze-gently.json","state":"freeze","episode":233,"related":["snb287-functional-freeze"]},{"id":"snb232-allowing-shutdown","title":"Does allowing shutdown reinforce it?","desc":"Someone in my community asked a question about coming out of shutdown.","groups":["shutdown","prac","hard"],"minutes":8,"source":"podcast","file":"learn/snb232-allowing-shutdown.json","state":"shutdown","episode":232,"related":["snb239-frustration-coming-out-of-shutdown"]},{"id":"snb231-can-anyone-self-regulate","title":"Can anyone recover through self-regulation?","desc":"Do you think anybody and everybody can recover from a stuck, traumatized state simply by accessing more of their Polyvagal safety state?","groups":["safety","rel","hard"],"minutes":4,"source":"podcast","file":"learn/snb231-can-anyone-self-regulate.json","state":"safety","episode":231,"related":["snb219-safety-when-you-struggle-to-feel-it"]},{"id":"snb229-shutdown-in-daily-life","title":"How shutdown shows up in daily life, and what people do about it","desc":"This is the third part of my Shutdown Experiences Survey results.","groups":["shutdown","rel","rest"],"minutes":18,"source":"podcast","file":"learn/snb229-shutdown-in-daily-life.json","state":"shutdown","episode":229,"related":["snb238-shutdown-support-survey"]},{"id":"snb228-safety-as-connection","title":"Safety means connection, and connection can look like anything","desc":"A member of my community asked me a big question about neurodivergence, finding safety and connection, how realistic that is, and what else it could look like.","groups":["safety","rel","prac"],"minutes":5,"source":"podcast","file":"learn/snb228-safety-as-connection.json","state":"safety","episode":228,"related":["snb213-co-regulation-in-trauma-recovery"]},{"id":"snb227-how-long-shutdown-lasts","title":"How long shutdown lasts, and how far away safety feels","desc":"This is the second part of my Shutdown Experiences Survey results.","groups":["shutdown","hard","feel"],"minutes":15,"source":"podcast","file":"learn/snb227-how-long-shutdown-lasts.json","state":"shutdown","episode":227,"related":["snb244-words-for-shutdown"]},{"id":"snb226-real-shutdown-experiences","title":"What shutdown feels like, in real people's words","desc":"You might be here because you're in a dorsal vagal shutdown. Or you might be caring for someone who is, like a family member or a therapy client.","groups":["shutdown","feel","rel"],"minutes":17,"source":"podcast","file":"learn/snb226-real-shutdown-experiences.json","state":"shutdown","episode":226,"related":["snb229-shutdown-in-daily-life"]},{"id":"snb224-freeze-cognitions-and-release","title":"Freeze, its thoughts, and how it releases","desc":"I created a resource called SSIEC. It stands for state, sensation, impulse, emotion, and cognition.","groups":["freeze","feel","hard"],"minutes":6,"source":"podcast","file":"learn/snb224-freeze-cognitions-and-release.json","state":"freeze","episode":224,"related":["snb233-thawing-freeze-gently"]},{"id":"snb223-slowly-stop-negative-coping","title":"How to slowly stop negative coping skills","desc":"Do you use negative coping skills to reduce your numbness, your panic, your feelings of being alone, or maybe rage or something else?","groups":["safety","build","hard"],"minutes":6,"source":"podcast","file":"learn/snb223-slowly-stop-negative-coping.json","state":"safety","episode":223,"related":["snb176-safety-versus-coping"]},{"id":"snb222-stage-fright","title":"Stage fright, freeze, and anchoring in safety","desc":"A listener replied to one of my emails, where I'd asked what people want to know about. Here's what she wrote:","groups":["freeze","work","prac"],"minutes":10,"source":"podcast","file":"learn/snb222-stage-fright.json","state":"freeze","episode":222,"related":["snb233-thawing-freeze-gently"]},{"id":"snb221-safety-cues-and-loved-ones","title":"Why loved ones don't always feel like safety cues","desc":"A listener sent me a message about family and safety cues. She wrote:","groups":["safety","rel"],"minutes":5,"source":"podcast","file":"learn/snb221-safety-cues-and-loved-ones.json","state":"safety","episode":221,"related":["snb228-safety-as-connection"]},{"id":"snb220-sadness-and-self-compassion","title":"Feeling sadness with self-compassion","desc":"A member of my community asked me a bunch of questions about sadness. Here's what she wrote:","groups":["shutdown","feel","prac"],"minutes":8,"source":"podcast","file":"learn/snb220-sadness-and-self-compassion.json","state":"shutdown","episode":220,"related":["snb236-validating-shutdown"]},{"id":"snb219-safety-when-you-struggle-to-feel-it","title":"Where to start when safety feels out of reach","desc":"People often ask, \"How do I access my polyvagal state of safety if I've never felt it?\" That's a great question.","groups":["safety","prac","rel"],"minutes":6,"source":"podcast","file":"learn/snb219-safety-when-you-struggle-to-feel-it.json","state":"safety","episode":219,"related":["snb250-passive-safety-cues"]},{"id":"snb218-courtneys-journey","title":"From safety to shutdown, through Courtney's story","desc":"You might have a general understanding of the Polyvagal Theory and the primary and mixed states.","groups":["safety","found","rel"],"minutes":14,"source":"podcast","file":"learn/snb218-courtneys-journey.json","state":"safety","episode":218,"related":["snb249-identify-your-autonomic-state"]},{"id":"snb217-growth-mindset","title":"Why mindset isn't your main problem","desc":"Mindset is important, but I don't think it's your problem. I don't think the way you think is what's causing the problems you're seeking help for.","groups":["safety","hard","prac"],"minutes":15,"source":"podcast","file":"learn/snb217-growth-mindset.json","state":"safety","episode":217,"related":["snb137-doubt-is-normal-in-change"]},{"id":"snb216-binge-eating-behavioral-adaptation","title":"Binge eating as a behavioral adaptation","desc":"Is binge eating a behavioral adaptation, or something else?","groups":["freeze","build","feel"],"minutes":5,"source":"podcast","file":"learn/snb216-binge-eating-behavioral-adaptation.json","state":"freeze","episode":216,"related":["snb143-addicted-to-one-thing-vs-another"]},{"id":"snb216-crying-in-trauma-recovery","title":"Do you have to cry to heal?","desc":"I recently answered a question about emotional regulation and crying: do we allow, or do we do?","groups":["safety","feel","prac"],"minutes":9,"source":"podcast","file":"learn/snb216-crying-in-trauma-recovery.json","state":"safety","episode":216,"related":["snb169-freeze-release-crying-and-self-harm"]},{"id":"snb215-deb-dana-contributions","title":"Four of Deb Dana's contributions to the Polyvagal Theory","desc":"The Polyvagal Theory is not easy. It's dense, it's highly academic, and it's really kind of like its own language.","groups":["safety","found","feel"],"minutes":11,"source":"podcast","file":"learn/snb215-deb-dana-contributions.json","state":"safety","episode":215,"related":["snb252-noticing-neuroception"]},{"id":"snb214-repair-or-move-on","title":"When you've hurt people: repair, move on, or start with yourself","desc":"This one starts with a question from someone in my community.","groups":["safety","rel"],"minutes":13,"source":"podcast","file":"learn/snb214-repair-or-move-on.json","state":"safety","episode":214,"related":["snb126-co-regulate-with-someone-who-hurt-you"]},{"id":"snb213-co-regulation-in-trauma-recovery","title":"How co-regulation helps in trauma recovery","desc":"Have you ever felt calmer and more secure just by being around a specific person?","groups":["safety","rel","prac"],"minutes":12,"source":"podcast","file":"learn/snb213-co-regulation-in-trauma-recovery.json","state":"safety","episode":213,"related":["snb231-can-anyone-self-regulate"]},{"id":"snb212-panic-at-the-same-time","title":"When panic comes at the same time every day","desc":"If you've been through a panic attack, you know that they are no joke.","groups":["safety","prac","build"],"minutes":5,"source":"podcast","file":"learn/snb212-panic-at-the-same-time.json","state":"safety","episode":212,"related":["snb192-panic-coping-vs-safety-grounding"]},{"id":"snb211-safety-state-spectrum","title":"The safety state spectrum, from dysregulation to connection","desc":"The ventral vagal safety state of the Polyvagal Theory may not be easily accessible, especially if you exist in a traumatized state.","groups":["safety","build","prac"],"minutes":13,"source":"podcast","file":"learn/snb211-safety-state-spectrum.json","state":"safety","episode":211,"related":["snb234-safety-when-always-in-defense"]},{"id":"snb209-still-stuck-in-shutdown","title":"Why you might still be stuck in shutdown","desc":"You're depressed. You've found and learned the Polyvagal Theory, and you know dorsal vagal shutdown is your dominant autonomic state.","groups":["shutdown","build","prac"],"minutes":9,"source":"podcast","file":"learn/snb209-still-stuck-in-shutdown.json","state":"shutdown","episode":209,"related":["snb232-allowing-shutdown"]},{"id":"snb208-coming-out-of-shutdown","title":"Coming out of dorsal vagal shutdown, step by step","desc":"You're experiencing symptoms of depression: a lack of motivation, an inability to experience happiness, reduced life satisfaction, isolating yourself,…","groups":["shutdown","prac","rel"],"minutes":14,"source":"podcast","file":"learn/snb208-coming-out-of-shutdown.json","state":"shutdown","episode":208,"related":["snb247-shutdown-to-freeze"]},{"id":"snb207-polyvagal-algorithm","title":"Your state is the missing piece between stimulus and response","desc":"You know the Polyvagal Theory and how it generally relates to mental health and trauma.","groups":["safety","found","surround"],"minutes":11,"source":"podcast","file":"learn/snb207-polyvagal-algorithm.json","state":"safety","episode":207,"related":["snb252-noticing-neuroception"]},{"id":"snb206-magic-pill-and-the-journey","title":"Would you take a magic pill for safety?","desc":"If there was a magic pill you could take to activate your polyvagal state of safety and social engagement, would you?","groups":["safety","hard","prac"],"minutes":7,"source":"podcast","file":"learn/snb206-magic-pill-and-the-journey.json","state":"safety","episode":206,"related":["snb175-wrong-about-trauma-recovery"]},{"id":"snb206-vagal-efficiency-and-the-vagal-brake","title":"What vagal efficiency is, and how to get more of it","desc":"If you're reading this, you're a fellow polyvagal nerd. You already understand the basic idea of the autonomic nervous system.","groups":["safety","found","prac"],"minutes":8,"source":"podcast","file":"learn/snb206-vagal-efficiency-and-the-vagal-brake.json","state":"safety","episode":206,"related":["snb211-safety-state-spectrum"]},{"id":"snb205-intimacy-and-mixed-states","title":"Is intimacy a mixed state, or stillness in context?","desc":"Fawn, appeasement, and intimacy were added to the Polyvagal Theory's mixed states. But is intimacy actually a mixed state, or is it something else?","groups":["stillness","found","rel"],"minutes":5,"source":"podcast","file":"learn/snb205-intimacy-and-mixed-states.json","state":"stillness","episode":205,"related":["snb245-states-and-productivity"]},{"id":"snb204-fawn-appeasement-mixed-states-or-adaptations","title":"Are fawn and appeasement mixed states or behavioral adaptations?","desc":"Fawn and appeasement are two of the three new mixed states added to the Polyvagal Theory. Intimacy is the third.","groups":["shutdown","found"],"minutes":12,"source":"podcast","file":"learn/snb204-fawn-appeasement-mixed-states-or-adaptations.json","state":"shutdown","episode":204,"related":["snb260-fawn-and-appease"]},{"id":"snb203-fawn-comply-to-survive","title":"Fawn and complying to survive","desc":"Fawn has officially been added to the growing list of Polyvagal Theory mixed states.","groups":["shutdown","found","rel"],"minutes":8,"source":"podcast","file":"learn/snb203-fawn-comply-to-survive.json","state":"shutdown","episode":203,"related":["snb202-appeasement-connect-to-survive"]},{"id":"snb202-appeasement-connect-to-survive","title":"Appeasement and connecting to survive","desc":"The Polyvagal Theory has three brand new additions to the mixed states: intimacy, fawning, and appeasement. Here I'll cover appeasement.","groups":["safety","found"],"minutes":8,"source":"podcast","file":"learn/snb202-appeasement-connect-to-survive.json","state":"safety","episode":202,"related":["snb204-fawn-appeasement-mixed-states-or-adaptations"]},{"id":"snb200-time-the-uncomfortable-truth","title":"The uncomfortable truth about time","desc":"This day is going to end.","groups":["safety","found","hard"],"minutes":8,"source":"podcast","file":"learn/snb200-time-the-uncomfortable-truth.json","state":"safety","episode":200,"related":["snb262-three-ways-through-overwhelm"]},{"id":"snb199-banging-on-the-window-neuroception","title":"Banging on the window at night, a neuroception story","desc":"I want to share a story about neuroception that happened to my family and me recently: someone banging on our window at around 11:00 at night.","groups":["fightflight","read","rest"],"minutes":7,"source":"podcast","file":"learn/snb199-banging-on-the-window-neuroception.json","state":"fightflight","episode":199,"related":["snb252-noticing-neuroception"]},{"id":"snb199-silence-and-mindfulness","title":"Silence as a mindfulness ingredient","desc":"You want to be more mindful to reduce negative emotions like stress, anxiety, worry, and panic.","groups":["safety","prac","rest"],"minutes":11,"source":"podcast","file":"learn/snb199-silence-and-mindfulness.json","state":"safety","episode":199,"related":["snb188-meditation-for-busy-people"]},{"id":"snb198-friendship-boundaries-rings-of-friendship","title":"Are they really a friend? Rings of friendship and where your energy goes","desc":"This topic comes up a lot in my work with teenagers, and in my work with adults as well: friendships and relationships, healthy boundaries, and what your…","groups":["rel","build"],"minutes":5,"source":"podcast","file":"learn/snb198-friendship-boundaries-rings-of-friendship.json","episode":198,"related":["snb133-behavior-not-toxicity"]},{"id":"snb198-sleep-stress-and-insomnia","title":"Can't sleep? Stress, insomnia, and the state of stillness","desc":"Are you tossing and turning at night, plagued by worries and anxieties? You're not alone.","groups":["stillness","rest","prac"],"minutes":8,"source":"podcast","file":"learn/snb198-sleep-stress-and-insomnia.json","state":"stillness","episode":198,"related":["snb199-silence-and-mindfulness"]},{"id":"snb197-feeling-stuck-touching-defense-lightly","title":"Lightly touching your stuck defensive state","desc":"Our bodies are naturally compelled to self-regulate and release trauma. It's called homeostasis.","groups":["safety","prac","build"],"minutes":6,"source":"podcast","file":"learn/snb197-feeling-stuck-touching-defense-lightly.json","state":"safety","episode":197,"related":["snb197-three-stages-of-trauma-healing"]},{"id":"snb197-three-stages-of-trauma-healing","title":"The three stages of trauma healing","desc":"There are three essential stages to trauma recovery. Here's what they are, and why I recommend them.","groups":["safety","hard","prac"],"minutes":10,"source":"podcast","file":"learn/snb197-three-stages-of-trauma-healing.json","state":"safety","episode":197,"related":["snb278-capacity-before-the-past"]},{"id":"snb196-personal-growth-no-permission-needed","title":"Personal growth, and why you don't need permission","desc":"You want to make changes in your life, maybe professionally or in your emotional regulation, but you're concerned about other people, and that stops you from…","groups":["safety","hard","prac"],"minutes":16,"source":"podcast","file":"learn/snb196-personal-growth-no-permission-needed.json","state":"safety","episode":196,"related":["snb217-growth-mindset"]},{"id":"snb194-polyvagal-therapist","title":"What a polyvagal therapist is, and how to find one","desc":"You've set out on a path toward healing and self-discovery.","groups":["safety","prac","rel"],"minutes":11,"source":"podcast","file":"learn/snb194-polyvagal-therapist.json","state":"safety","episode":194,"related":["snb158-current-therapist-not-as-good"]},{"id":"snb193-understanding-dorsal-vagal-shutdown","title":"Understanding dorsal vagal shutdown, and how to start coming out of it","desc":"Have you ever felt so overwhelmed that you just shut down, emotionally and physically?","groups":["shutdown","rel","prac"],"minutes":11,"source":"podcast","file":"learn/snb193-understanding-dorsal-vagal-shutdown.json","state":"shutdown","episode":193,"related":["snb208-coming-out-of-shutdown"]},{"id":"snb192-panic-coping-vs-safety-grounding","title":"Panic attacks, coping, and grounding in safety","desc":"Can panic attacks get better? Generally, I think they can. They can be overwhelming, even debilitating, but I think there's a lot of hope.","groups":["freeze","feel","build"],"minutes":13,"source":"podcast","file":"learn/snb192-panic-coping-vs-safety-grounding.json","state":"freeze","episode":192,"related":["snb212-panic-at-the-same-time"]},{"id":"snb191-trusting-your-power-to-self-regulate","title":"Trusting your body's power to self-regulate","desc":"In the journey of trauma recovery, understanding self-regulation and building trust in your body's natural capacity for healing is important, though difficult.","groups":["safety","rel","prac"],"minutes":13,"source":"podcast","file":"learn/snb191-trusting-your-power-to-self-regulate.json","state":"safety","episode":191,"related":["snb259-stop-trying-to-change-your-state"]},{"id":"snb190-emotional-impacts-of-trauma","title":"Five emotional impacts of trauma, plus one more","desc":"Trauma can leave lasting effects on our emotional well-being.","groups":["fightflight","feel","found"],"minutes":8,"source":"podcast","file":"learn/snb190-emotional-impacts-of-trauma.json","state":"fightflight","episode":190,"related":["snb241-beneath-your-emotions"]},{"id":"snb189-easy-anxiety-management-skills","title":"Seven easy ways to manage anxiety","desc":"If you're struggling with daily anxiety, you need immediate skills to manage the experience and get you to a functional baseline, so you can stop ruminating,…","groups":["fightflight","feel","prac"],"minutes":12,"source":"podcast","file":"learn/snb189-easy-anxiety-management-skills.json","state":"fightflight","episode":189,"related":["snb183-managing-anxiety-daily"]},{"id":"snb188-meditation-for-busy-people","title":"Easy meditation for busy people","desc":"No, you are not too busy to start bringing meditative or mindfulness practices into your daily life. I should know, because I'm busy too.","groups":["safety","prac","body"],"minutes":10,"source":"podcast","file":"learn/snb188-meditation-for-busy-people.json","state":"safety","episode":188,"related":["snb199-silence-and-mindfulness"]},{"id":"snb187-feel-your-feelings","title":"How to feel your feelings with mindfulness","desc":"Have you ever felt overwhelmed by your emotions? Do you sometimes struggle to understand why you feel or think a certain way? If so, you're not alone.","groups":["safety","feel","prac"],"minutes":8,"source":"podcast","file":"learn/snb187-feel-your-feelings.json","state":"safety","episode":187,"related":["snb160-gently-allowing-emotion-and-sensation"]},{"id":"snb186-permission-to-feel","title":"Giving yourself permission to feel your feelings","desc":"One of the things that may be keeping you stuck in an uncomfortable emotion is that you're not giving it permission to exist.","groups":["safety","feel","prac"],"minutes":7,"source":"podcast","file":"learn/snb186-permission-to-feel.json","state":"safety","episode":186,"related":["snb187-feel-your-feelings"]},{"id":"snb185-emotional-normalization","title":"Emotional normalization: making sense of your emotions","desc":"Are you able to normalize your emotions? Do you know what normalization is? Fret not.","groups":["feel","prac"],"minutes":7,"source":"podcast","file":"learn/snb185-emotional-normalization.json","episode":185,"related":["snb251-validate-and-normalize-yourself"]},{"id":"snb184-what-validation-is","title":"What validation is, and how it helps in trauma recovery","desc":"Are you able to validate your feelings? Do you know what validation is? Let's look at what it is and how you can start validating yourself now.","groups":["safety","feel","prac"],"minutes":8,"source":"podcast","file":"learn/snb184-what-validation-is.json","state":"safety","episode":184,"related":["snb185-emotional-normalization"]},{"id":"snb183-managing-anxiety-daily","title":"Five practical ways to manage anxiety in daily life","desc":"Anxiety is probably something you're intimately familiar with. But do you know what anxiety actually is, and what to do about it?","groups":["fightflight","feel","prac"],"minutes":13,"source":"podcast","file":"learn/snb183-managing-anxiety-daily.json","state":"fightflight","episode":183,"related":["snb246-anxiety-and-the-cause"]},{"id":"snb182-affirmations-and-story-follows-state","title":"Why positive affirmations might not be helping","desc":"You might be using positive affirmations as part of your trauma recovery process, or as part of your daily grounding practice. That's fine.","groups":["safety","meaning","feel"],"minutes":6,"source":"podcast","file":"learn/snb182-affirmations-and-story-follows-state.json","state":"safety","episode":182,"related":["snb279-five-self-help-habits"]},{"id":"snb180-the-state-behind-your-thoughts","title":"The state behind your thoughts","desc":"What's the emotion, and what's the state, that is driving your thoughts? In my opinion, that is more significant than the thoughts themselves.","groups":["safety","feel","prac"],"minutes":6,"source":"podcast","file":"learn/snb180-the-state-behind-your-thoughts.json","state":"safety","episode":180,"related":["snb182-affirmations-and-story-follows-state"]},{"id":"snb179-reduce-fear-during-trauma-work","title":"Three ways to reduce fear during trauma work","desc":"Fear is probably a major obstacle in your trauma recovery.","groups":["freeze","prac","build"],"minutes":7,"source":"podcast","file":"learn/snb179-reduce-fear-during-trauma-work.json","state":"freeze","episode":179,"related":["snb267-drained-after-therapy"]},{"id":"snb178-desperate-decision","title":"The time desperation talked me into spending $9,000","desc":"Desperation can bring us to some scary places.","groups":["fightflight","feel","meaning"],"minutes":13,"source":"podcast","file":"learn/snb178-desperate-decision.json","state":"fightflight","episode":178,"related":["snb142-pulled-in-different-directions"]},{"id":"snb177-new-narrative-for-shame-and-blame","title":"A new narrative for shame, blame and judgment","desc":"Are you struggling with shame, blame, or judgment? You might have been taught that you need to sit with the feelings or talk them out.","groups":["safety","found","feel"],"minutes":8,"source":"podcast","file":"learn/snb177-new-narrative-for-shame-and-blame.json","state":"safety","episode":177,"related":["snb265-shame-anger-pendulation"]},{"id":"snb176-safety-versus-coping","title":"Anchored in safety, or just coping","desc":"Accessing your safety state is different from coping with emotional dysregulation. Here I want to look at the difference, and at how you can use both.","groups":["safety","prac","feel"],"minutes":5,"source":"podcast","file":"learn/snb176-safety-versus-coping.json","state":"safety","episode":176,"related":["snb242-four-wellness-pathways"]},{"id":"snb175-wrong-about-trauma-recovery","title":"I was wrong about trauma recovery","desc":"I'm a therapist, and I was wrong about trauma recovery.","groups":["safety","hard","prac"],"minutes":12,"source":"podcast","file":"learn/snb175-wrong-about-trauma-recovery.json","state":"safety","episode":175,"related":["snb264-safety-first-trauma-exercises"]},{"id":"snb174-after-learning-polyvagal-theory","title":"What to do after learning the Polyvagal Theory","desc":"You've learned the Polyvagal Theory, so now what? What do you do with this information?","groups":["safety","build","prac"],"minutes":8,"source":"podcast","file":"learn/snb174-after-learning-polyvagal-theory.json","state":"safety","episode":174,"related":["snb242-four-wellness-pathways"]},{"id":"snb173-happiness-and-safety","title":"There's no key to happiness, but there is safety","desc":"What is happiness? What is not happiness? And is there a key to happiness? Let's look at happiness through the Polyvagal Theory.","groups":["safety","feel","rel"],"minutes":11,"source":"podcast","file":"learn/snb173-happiness-and-safety.json","state":"safety","episode":173,"related":["snb164-polyvagal-safety-and-how-to-build-it"]},{"id":"snb172-relieving-a-stuck-fight-state","title":"How to come out of a stuck fight state","desc":"What are the best ways to come out of a polyvagal fight state? Should you scream into a pillow? Should you punch things?","groups":["fightflight","feel","prac"],"minutes":10,"source":"podcast","file":"learn/snb172-relieving-a-stuck-fight-state.json","state":"fightflight","episode":172,"related":["snb261-boundaries-safety-and-fight"]},{"id":"snb171-relax-or-release","title":"Do you relax to release trauma, or release trauma to relax?","desc":"Do you need to relax in order to discharge trauma, or do you need to discharge trauma in order to relax?","groups":["safety","prac","rel"],"minutes":19,"source":"podcast","file":"learn/snb171-relax-or-release.json","state":"safety","episode":171,"related":["snb278-capacity-before-the-past"]},{"id":"snb170-resistance-to-ladder-climbing","title":"Why you resist climbing your ladder","desc":"Why do you have resistance to climbing your polyvagal ladder and accessing your safety state?","groups":["shutdown","feel","hard"],"minutes":13,"source":"podcast","file":"learn/snb170-resistance-to-ladder-climbing.json","state":"shutdown","episode":170,"related":["snb232-allowing-shutdown"]},{"id":"snb169-freeze-release-crying-and-self-harm","title":"Freeze, crying, and the difference between regulated and dysregulated release","desc":"The freeze mixed state can have a regulated release and a dysregulated release. I want to make sure you can spot the difference.","groups":["freeze","feel","build"],"minutes":11,"source":"podcast","file":"learn/snb169-freeze-release-crying-and-self-harm.json","state":"freeze","episode":169,"related":["snb243-crying-release-panic-rage"]},{"id":"snb168-impulses-and-trauma-releasing","title":"Unstucking, pendulation, and acting on impulses","desc":"When it comes to trauma relief, what is unstucking? What are pendulation and titration? And what do impulses have to do with any of this?","groups":["freeze","body","hard"],"minutes":11,"source":"podcast","file":"learn/snb168-impulses-and-trauma-releasing.json","state":"freeze","episode":168,"related":["snb171-relax-or-release"]},{"id":"snb167-grief-and-polyvagal-theory","title":"Grief is all over the ladder","desc":"How does grief fit into the Polyvagal Theory? Where does it fall on the polyvagal ladder? The short answer: everywhere. It's up and down the ladder.","groups":["shutdown","feel","rel"],"minutes":5,"source":"podcast","file":"learn/snb167-grief-and-polyvagal-theory.json","state":"shutdown","episode":167,"related":["snb161-pendulation-grief-imagination"]},{"id":"snb166-dealing-with-anger","title":"Dealing with anger through the Polyvagal Theory","desc":"How do you deal with anger, and with being stuck in defensive thought patterns?","groups":["fightflight","feel","read"],"minutes":8,"source":"podcast","file":"learn/snb166-dealing-with-anger.json","state":"fightflight","episode":166,"related":["snb172-relieving-a-stuck-fight-state"]},{"id":"snb165-self-regulating-through-triggering-events","title":"How to self-regulate through triggering events","desc":"How do you self-regulate through extreme situations, and is that even possible? It's a common question, and it can look a few different ways.","groups":["safety","prac","rel"],"minutes":8,"source":"podcast","file":"learn/snb165-self-regulating-through-triggering-events.json","state":"safety","episode":165,"related":["snb215-deb-dana-contributions"]},{"id":"snb164-polyvagal-safety-and-how-to-build-it","title":"What polyvagal safety is, and how to build it","desc":"What is polyvagal safety, and how do you use it?","groups":["safety","rel","prac"],"minutes":7,"source":"podcast","file":"learn/snb164-polyvagal-safety-and-how-to-build-it.json","state":"safety","episode":164,"related":["snb219-safety-when-you-struggle-to-feel-it"]},{"id":"snb163-polyvagal-theory-for-total-beginners","title":"Polyvagal Theory for total beginners","desc":"The Polyvagal Theory is very complex. If you're a complete and utter beginner, having a foundation can help you move on to learning more in depth.","groups":["safety","start","build"],"minutes":8,"source":"podcast","file":"learn/snb163-polyvagal-theory-for-total-beginners.json","state":"safety","episode":163,"related":["snb101-polyvagal-101-foundations"]},{"id":"snb162-possible-to-come-out-of-shutdown","title":"Is it possible to come out of shutdown?","desc":"Someone left a comment on one of my YouTube videos asking, \"Is it possible to come out of polyvagal shutdown?\"","groups":["shutdown","prac","hard"],"minutes":7,"source":"podcast","file":"learn/snb162-possible-to-come-out-of-shutdown.json","state":"shutdown","episode":162,"related":["snb208-coming-out-of-shutdown"]},{"id":"snb161-pendulation-grief-imagination","title":"Pendulation in grief, and imagination as a safety anchor","desc":"A few things came up in a conversation with members of one of my courses that I think are really worth sharing.","groups":["safety","feel","prac"],"minutes":11,"source":"podcast","file":"learn/snb161-pendulation-grief-imagination.json","state":"safety","episode":161,"related":["snb167-grief-and-polyvagal-theory"]},{"id":"snb160-gently-allowing-emotion-and-sensation","title":"Gently allowing emotion and sensation","desc":"What do the shifts in your state actually look like from the inside, and how can you gently let yourself come out of a stuck state without sending yourself…","groups":["shutdown","feel","prac"],"minutes":12,"source":"podcast","file":"learn/snb160-gently-allowing-emotion-and-sensation.json","state":"shutdown","episode":160,"related":["snb186-permission-to-feel"]},{"id":"snb159-coming-out-of-flight-fight","title":"Coming out of flight and fight","desc":"What is the flight and fight state for, and how do you climb out of it?","groups":["fightflight","build","prac"],"minutes":14,"source":"podcast","file":"learn/snb159-coming-out-of-flight-fight.json","state":"fightflight","episode":159,"related":["snb172-relieving-a-stuck-fight-state"]},{"id":"snb158-current-therapist-not-as-good","title":"When your current therapist doesn't feel as good as your last","desc":"A listener left a comment on my blog about two therapists: one she connected with, and one she isn't connecting with now.","groups":["safety","prac","rel"],"minutes":15,"source":"podcast","file":"learn/snb158-current-therapist-not-as-good.json","state":"safety","episode":158,"related":["snb194-polyvagal-therapist"]},{"id":"snb156-trauma-and-polyvagal-theory","title":"How trauma connects to Polyvagal Theory","desc":"So how does all of this connect to trauma?","groups":["freeze","found","start"],"minutes":8,"source":"podcast","file":"learn/snb156-trauma-and-polyvagal-theory.json","state":"freeze","episode":156,"related":["snb190-emotional-impacts-of-trauma"]},{"id":"snb155-fawning-and-distress-tolerance","title":"Fawning, and building distress tolerance","desc":"Two questions come up a lot when I teach Polyvagal 101. How does fawning fit into the Polyvagal Theory?","groups":["shutdown","found","prac"],"minutes":5,"source":"podcast","file":"learn/snb155-fawning-and-distress-tolerance.json","state":"shutdown","episode":155,"related":["snb203-fawn-comply-to-survive"]},{"id":"snb154-ssiec-state-sensation-impulse-emotion-cognition","title":"How your state connects to sensation, impulse, emotion, and cognition","desc":"SSIEC stands for state, sensation, impulse, emotion, and cognition.","groups":["safety","feel","prac"],"minutes":7,"source":"podcast","file":"learn/snb154-ssiec-state-sensation-impulse-emotion-cognition.json","state":"safety","episode":154,"related":["snb237-validating-maria"]},{"id":"snb152-its-just-you-4-you-are-enough","title":"It's just you, part 4: you are enough","desc":"Over the last three episodes I've talked about how you don't have parts, you're not reparenting yourself, you don't have a shadow, and you don't have an ego.","groups":["prac","found"],"minutes":13,"source":"podcast","file":"learn/snb152-its-just-you-4-you-are-enough.json","episode":152,"related":["snb191-trusting-your-power-to-self-regulate"]},{"id":"snb151-its-just-you-3-rebuttals","title":"It's just you, part 3: answering the rebuttals","desc":"In episode 149, I laid out the case that you don't have parts, you don't have a shadow self, you don't have an ego, and no, not even a puzzle self.","groups":["prac","found"],"minutes":13,"source":"podcast","file":"learn/snb151-its-just-you-3-rebuttals.json","episode":151,"related":["snb152-its-just-you-4-you-are-enough"]},{"id":"snb150-its-just-you-2-supportive-responses","title":"It's just you, part two: what listeners said","desc":"I made the case that it's just you. There are no parts. There's no shadow. There's no reparenting, no ego, no this and that. It's just you.","groups":["safety","prac","found"],"minutes":13,"source":"podcast","file":"learn/snb150-its-just-you-2-supportive-responses.json","state":"safety","episode":150,"related":["snb151-its-just-you-3-rebuttals"]},{"id":"snb149-its-just-you-1-no-ego-no-shadow-no-parts","title":"It's just you: where psychological concepts fit","desc":"It's just you.","groups":["prac","found"],"minutes":17,"source":"podcast","file":"learn/snb149-its-just-you-1-no-ego-no-shadow-no-parts.json","episode":149,"related":["snb150-its-just-you-2-supportive-responses"]},{"id":"snb148-active-passive-cues-and-context","title":"Active and passive cues, and the context around them","desc":"Your sensory input can take you out of your safety state without you even realizing it.","groups":["safety","build","prac"],"minutes":9,"source":"podcast","file":"learn/snb148-active-passive-cues-and-context.json","state":"safety","episode":148,"related":["snb250-passive-safety-cues"]},{"id":"snb147-safety-cues-and-swiss-design","title":"Safety cues, Swiss design, and the impulse to connect","desc":"I want to talk about feeling anchored in safety, the impulse to connect, and my newfound interest in design, which has helped me get more anchored in my own…","groups":["safety","build","body"],"minutes":9,"source":"podcast","file":"learn/snb147-safety-cues-and-swiss-design.json","state":"safety","episode":147,"related":["snb148-active-passive-cues-and-context"]},{"id":"snb145-calm-shame-time-outs","title":"Calm versus regulation, shame, and time-outs","desc":"These are questions people brought me, and the conversation covered a lot: the difference between calm and regulation, faking safety, the Will Smith moment at…","groups":["safety","feel","rel"],"minutes":15,"source":"podcast","file":"learn/snb145-calm-shame-time-outs.json","state":"safety","episode":145,"related":["snb177-new-narrative-for-shame-and-blame"]},{"id":"snb144-compromised-vagal-brake","title":"Why a trauma survivor's vagal brake is compromised","desc":"Someone asked me: \"Why is it that trauma survivors have a compromised vagal brake?\" To answer that, we need to understand two things first: what the vagal…","groups":["safety","found","build"],"minutes":4,"source":"podcast","file":"learn/snb144-compromised-vagal-brake.json","state":"safety","episode":144,"related":["snb206-vagal-efficiency-and-the-vagal-brake"]},{"id":"snb143-addicted-to-one-thing-vs-another","title":"Why we get addicted to one thing and not another","desc":"A listener sent me a question that I want to take on. It's a complex one, and these are my thoughts as they come to me, not a fully worked-out answer.","groups":["freeze","build","found"],"minutes":4,"source":"podcast","file":"learn/snb143-addicted-to-one-thing-vs-another.json","state":"freeze","episode":143,"related":["snb223-slowly-stop-negative-coping"]},{"id":"snb142-pulled-in-different-directions","title":"Being pulled in different directions","desc":"A listener sent me this question:","groups":["safety","feel","body"],"minutes":8,"source":"podcast","file":"learn/snb142-pulled-in-different-directions.json","state":"safety","episode":142,"related":["snb168-impulses-and-trauma-releasing"]},{"id":"snb141-acting-out-vs-acting-in","title":"Acting out versus acting in","desc":"A listener asked a general question I want to answer:","groups":["build","feel"],"minutes":3,"source":"podcast","file":"learn/snb141-acting-out-vs-acting-in.json","episode":141,"related":["snb143-addicted-to-one-thing-vs-another"]},{"id":"snb140-tried-everything-still-numb","title":"I've tried everything and I'm still numb","desc":"I want to talk about having tried everything, about shutdown and numbness, and about how safety can actually lead to defensive feelings.","groups":["shutdown","prac","build"],"minutes":13,"source":"podcast","file":"learn/snb140-tried-everything-still-numb.json","state":"shutdown","episode":140,"related":["snb208-coming-out-of-shutdown"]},{"id":"snb138-thinking-not-feeling","title":"You're thinking, not feeling","desc":"I think your thinking is keeping you stuck, and I think you should be doing more feeling.","groups":["fightflight","read","feel"],"minutes":8,"source":"podcast","file":"learn/snb138-thinking-not-feeling.json","state":"fightflight","episode":138,"related":["snb187-feel-your-feelings"]},{"id":"snb137-doubt-is-normal-in-change","title":"Doubt is a normal part of change","desc":"I want to talk about the process of change, including doubt, self-judgment, and evaluating yourself.","groups":["safety","hard","read"],"minutes":11,"source":"podcast","file":"learn/snb137-doubt-is-normal-in-change.json","state":"safety","episode":137,"related":["snb170-resistance-to-ladder-climbing"]},{"id":"snb136-high-stress-jobs-vagal-brake","title":"High stress jobs and the vagal brake","desc":"This one is especially for those in helping professions that deal with crises regularly, though it could easily be for parents and teachers as well.","groups":["safety","build","rel"],"minutes":18,"source":"podcast","file":"learn/snb136-high-stress-jobs-vagal-brake.json","state":"safety","episode":136,"related":["snb144-compromised-vagal-brake"]},{"id":"snb135-safety-cue-dependency","title":"Can you become dependent on safety cues?","desc":"I want to talk about safety cues: what they are, how to help your clients notice them and savor them, and hopefully grow the ability to get a bit more unstuck.","groups":["safety","prac","build"],"minutes":13,"source":"podcast","file":"learn/snb135-safety-cue-dependency.json","state":"safety","episode":135,"related":["snb250-passive-safety-cues"]},{"id":"snb134-why-therapy-ignored-the-body","title":"Why therapy has ignored the body","desc":"This one is for my fellow therapists, to think about therapy differently, though if you're not a therapist, you're more than welcome to read along.","groups":["safety","prac","body"],"minutes":15,"source":"podcast","file":"learn/snb134-why-therapy-ignored-the-body.json","state":"safety","episode":134,"related":["snb194-polyvagal-therapist"]},{"id":"snb133-behavior-not-toxicity","title":"Focus on behavior, not toxicity","desc":"This one is about toxicity, behavior, and personal boundaries, to help you prioritize yourself and maybe get a bit more unstuck.","groups":["safety","rel"],"minutes":12,"source":"podcast","file":"learn/snb133-behavior-not-toxicity.json","state":"safety","episode":133,"related":["snb261-boundaries-safety-and-fight"]},{"id":"snb132-intimacy-after-childhood-sexual-abuse","title":"Intimacy after a history of childhood sexual abuse","desc":"Please put yourself first with this one.","groups":["freeze","found","rel"],"minutes":14,"source":"podcast","file":"learn/snb132-intimacy-after-childhood-sexual-abuse.json","state":"freeze","episode":132,"related":["snb205-intimacy-and-mixed-states"]},{"id":"snb131-isolation-keeps-you-stuck","title":"Isolation keeps you stuck","desc":"This continues what keeps you stuck. Last time it was your stories. This time it's isolation, and your support system.","groups":["safety","rel","feel"],"minutes":8,"source":"podcast","file":"learn/snb131-isolation-keeps-you-stuck.json","state":"safety","episode":131,"related":["snb213-co-regulation-in-trauma-recovery"]},{"id":"snb130-parenting-without-models","title":"Parenting without a model of good enough parents","desc":"A parent wrote to me with a question about the flight and fight energy that comes up in parenting: how to keep it in check, and how not to pass it on to the…","groups":["fightflight","family","rel"],"minutes":15,"source":"podcast","file":"learn/snb130-parenting-without-models.json","state":"fightflight","episode":130,"related":["snb272-hit-it-back"]},{"id":"snb130-your-stories-keep-you-stuck","title":"Your stories keep you stuck","desc":"This is the first in a series on what keeps you stuck. This one is about your stories.","groups":["safety","feel","hard"],"minutes":8,"source":"podcast","file":"learn/snb130-your-stories-keep-you-stuck.json","state":"safety","episode":130,"related":["snb180-the-state-behind-your-thoughts"]},{"id":"snb127-defensive-state-or-autism","title":"A partner's defensive state, autism, and co-regulation","desc":"A listener wrote to me with a question that touches three things: autism and the Polyvagal Theory, our partner's defensive state, and how we feel about that.","groups":["safety","rel"],"minutes":16,"source":"podcast","file":"learn/snb127-defensive-state-or-autism.json","state":"safety","episode":127,"related":["snb221-safety-cues-and-loved-ones"]},{"id":"snb126-co-regulate-with-someone-who-hurt-you","title":"Can you co-regulate with someone who traumatized you?","desc":"A listener asked me whether we can co-regulate with someone who traumatized us. Please put yourself first with this one. It might be challenging.","groups":["fightflight","rel"],"minutes":16,"source":"podcast","file":"learn/snb126-co-regulate-with-someone-who-hurt-you.json","state":"fightflight","episode":126,"related":["snb214-repair-or-move-on"]},{"id":"snb101-polyvagal-101-foundations","title":"Polyvagal 101: the autonomic nervous system, neuroception, and story follows state","desc":"This is a return to the foundations of the Polyvagal Theory from Dr. Stephen Porges. Along the way you'll hear from two other people: Dr.","groups":["safety","start","read"],"minutes":25,"source":"podcast","file":"learn/snb101-polyvagal-101-foundations.json","state":"safety","episode":101,"related":["snb249-identify-your-autonomic-state"]}];
  GEN_PIECES.forEach(p => PIECES.push(p));
  /* END GENERATED PIECES */
  // the main insight of a week post (post.lead) -> a topic group (LEARNING-GROUPS.md)
  const INSIGHT_GROUP = { toSafety:'build', steadySafe:'build', toDefense:'hard', stretch:'hard', steadyDef:'feel',
    payoff:'prac', firstBest:'prac', thin:'start', late:'rest', evening:'rest', mixed:'read' };
  // a journal answer (context chip) -> a topic group
  const CHIP_GROUP = { 'work':'work', 'family':'family', 'friends':'rel', 'partner':'rel', 'hobbies':'playcre', 'spiritual':'meaning',
    'nature':'surround', 'body & movement':'body', 'rest':'rest', 'practice':'prac', 'something else':'found' };
  // ---- Learning hubs (Justin, 2026-10-01: "treating this as a real blog") ----
  // One hub per state and per topic group. A state hub opens with the intro from Justin's matching hub on
  // stucknotbroken.com (Public Resources) where one exists; play and stillness use the app's own state text.
  // Topic intros marked DRAFT are App Designer's placeholders for Justin. A piece may carry `related: [ids]`
  // (Curriculum Advisor's suggested links); inline links can point in-app with [text](piece:id) or [text](hub:key).
  const STATE_HUBS = ['safety', 'play', 'stillness', 'fightflight', 'freeze', 'shutdown'];
  const TOPICS = { build:'Building safety', hard:'When things get tough and change is slow', prac:'How practice works', start:'Starting small',
    rest:'Rest and sleep', read:'Reading your state', feel:'Feelings', work:'Work and stress', family:'Family and parenting',
    rel:'Relationships and connection', playcre:'Play and creativity', meaning:'Your story and meaning', surround:'Your surroundings',
    body:'Body, breath and movement', found:'How your nervous system works' };
  const TOPIC_ORDER = ['build','start','prac','read','feel','hard','rest','body','surround','rel','family','work','playcre','meaning','found'];
  const HUBS = {
    safety: { source:'stucknotbroken.com/c/public_resources/safety-hub', intro:[
      { p:'Polyvagal safety is more than just feeling good. It is a biological state where your nervous system supports connection, health, growth, and restoration. Unlike coping, which manages stress, safety allows you to actually recover from and buffer against future stress.' },
      { p:'Use the articles below to learn how to access your ventral vagal state and tell true safety apart from defensive adaptations.' } ] },
    play: { source:'app state text', intro:[
      { p:'Play is safety and energy at the same time, the social, mobilized kind shared with people you trust. On your own, the same drive shows up as motivation. It\'s the same fuel as flight/fight, with safety mixed in, so it runs as creativity and drive instead of defense.' } ] },
    stillness: { source:'app state text', intro:[
      { p:'Stillness is the body slowed and quiet, without fear. The same powering-down as shutdown, but with safety mixed in, so it restores instead of collapses. On your own it\'s stillness; shared with someone safe, it\'s intimacy. A deeply regulated state.' } ] },
    fightflight: { source:'stucknotbroken.com/c/public_resources/flight-fight-hub', intro:[
      { p:'Flight/fight activation isn\'t "bad behavior." It comes from your body\'s <b>sympathetic</b> state. It is a survival response designed to mobilize you for safety.' },
      { ul:[ '<b>Flight</b> is the urge to escape and create space (often felt as anxiety or avoidance).', '<b>Fight</b> is the impulse to close the space and back the danger off (often felt as anger or irritability).' ] },
      { p:'Use the articles below to recognize these sympathetic shifts and learn how to discharge that survival energy safely.' } ] },
    freeze: { source:'stucknotbroken.com/c/public_resources/freeze-hub', intro:[
      { p:'In Polyvagal Theory, <b>freeze</b> is not the same as shutdown. It is a mixed state that combines the energy of sympathetic flight/fight with the stillness of dorsal vagal shutdown.' },
      { p:'Think of it like a car with <b>one foot on the accelerator and one foot on the brake</b>. Your body is revving with energy (panic, rage, overwhelm), but you feel unable to move or speak.' },
      { h3:'Common signs you might be in freeze' },
      { p:'Moments of being unable to speak or act even when you want to, feeling frozen in place during conflict or overwhelm, a racing heart with an inability to move, feeling terrified but looking calm on the outside, or a sudden inability to think clearly in the middle of a stressful situation. It can also show up as dissociation, feeling outside yourself, or a strange slow-motion quality to your experience. These are all nervous system responses, not character weaknesses.' },
      { p:'Use the articles below to untangle this mixed state and learn how to safely release the brake without crashing.' } ] },
    shutdown: { source:'stucknotbroken.com/c/public_resources/shutdown-hub', intro:[
      { p:'If you feel heavy, foggy, or completely disconnected, you aren\'t lazy or broken. You may be in <b>dorsal vagal shutdown</b>. This is your nervous system\'s oldest defense strategy: conserving energy to keep you safe when fight or flight is impossible.' },
      { p:'Moving out of shutdown is counterintuitive. Trying to push through often pushes you deeper. Instead, we gently signal safety to the body.' },
      { h3:'Common signs of shutdown' },
      { ul:[ 'feeling emotionally numb or flat', 'extreme fatigue or exhaustion that sleep does not fix', 'difficulty speaking or finding words', 'brain fog and trouble concentrating', 'a sense of being outside your body or disconnected from your surroundings', 'low blood pressure, slowed heart rate', 'a collapsed or slumped posture' ] },
      { h3:'Shutdown responds well to' },
      { ul:[ 'small, predictable actions', 'reduced sensory stimulation', 'warmth and containment', 'natural elements and quiet' ] },
      { p:'These are not cures. They are gentle invitations to the nervous system to begin nudging its way out of shutdown and into mobilization.' } ] },
    family: { source:'stucknotbroken.com/c/public_resources/parenting-hub', intro:[
      { p:'Parenting through a Polyvagal lens shifts the focus from simply changing behavior to helping regulate the nervous system. A child\'s "acting out" isn\'t always a choice. It may be the behavioral result of a biological shift into a defensive state, such as sympathetic flight/fight or a dorsal vagal shutdown.' },
      { p:'Polyvagal parenting isn\'t about being perfect. It is about <b>co-regulation</b>: using your own grounded nervous system to help your child feel safe again.' } ] },
    // DRAFT intros (App Designer, 2026-10-01), for Justin to replace or approve
    build: { draft:true, intro:[{ p:'Safety is something you build, a little at a time. These articles are about how.' }] },
    hard: { draft:true, intro:[{ p:'Change is slow, and some times are harder than others. These articles are for when things get tough.' }] },
    prac: { draft:true, intro:[{ p:'What practice is, why it works, and how to make it fit your life.' }] },
    start: { draft:true, intro:[{ p:'Small is how it starts. These articles are about the first steps.' }] },
    rest: { draft:true, intro:[{ p:'How rest and sleep fit with your nervous system.' }] },
    read: { draft:true, intro:[{ p:'How to tell which state you\'re in, and what it\'s telling you.' }] },
    feel: { draft:true, intro:[{ p:'Feelings, and how to make room for them.' }] },
    work: { draft:true, intro:[{ p:'Work, stress, and your nervous system.' }] },
    rel: { draft:true, intro:[{ p:'Connection, co-regulation, and the people in your life.' }] },
    playcre: { draft:true, intro:[{ p:'Play, creativity, and the energy that comes with safety.' }] },
    meaning: { draft:true, intro:[{ p:'Your story, your growth, and what it means to get unstuck.' }] },
    surround: { draft:true, intro:[{ p:'The places around you, and the cues of safety they give.' }] },
    body: { draft:true, intro:[{ p:'Your body, your breath, and how movement fits in.' }] },
    found: { draft:true, intro:[{ p:'How your nervous system works, in plain words.' }] }
  };
  // the next piece to read after this one: Curriculum Advisor's related list first, then the piece sharing the most groups
  function nextFor(piece){
    if(!piece) return null;
    for(const id of (piece.related || [])){ const p = PIECES.find(x => x.id === id); if(p && p.id !== piece.id) return p; }
    let best = null, bestN = 0;
    PIECES.forEach(p => { if(p.id === piece.id) return; const n = p.groups.filter(g => piece.groups.indexOf(g) >= 0).length; if(n > bestN){ best = p; bestN = n; } });
    if(best) return best;
    // nothing shares a group: a piece about a neighboring state (freeze is flight/fight plus shutdown, and so on)
    const NEAR = { freeze:['shutdown','fightflight','safety'], shutdown:['freeze','stillness','safety'], fightflight:['freeze','play','safety'],
      play:['safety','fightflight'], stillness:['safety','shutdown'], safety:['play','stillness','shutdown','fightflight','freeze'] };
    for(const st of (NEAR[piece.state] || [])){ const p = PIECES.find(x => x.state === st && x.id !== piece.id); if(p) return p; }
    return null;
  }
  const inGroup = g => g ? PIECES.filter(p => p.groups.indexOf(g) >= 0) : [];
  const byId = id => PIECES.find(p => p.id === id) || null;
  global.Learning = { PIECES, INSIGHT_GROUP, CHIP_GROUP, inGroup, byId, STATE_HUBS, TOPICS, TOPIC_ORDER, HUBS, nextFor };
})(window);
