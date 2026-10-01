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
   Blocks: {p} {h} {h3} {ul} {ol} {callout:id} {practice:'anchoring'|'mindfulness'|'custom', sense?, why}.
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
