// Outward-facing method to return attribute object from the selected verb
function getAttributes(verb) {
    if(SP5_VERBS.includes(verb) || SP6_VERBS.includes(verb)) {
        return getAttributesOld(verb);
    }
    console.log("Verb not supported yet");
    return getAttributesOld(verb)
}


// Factory method to return verb attributes as a single object
function buildVerb(end, refl, changeType, eng, irrForms = {}) {
    return {
        endingType: end, // Integer code that corresponds to verb ending
        isReflexive: refl, // Boolean
        stemChangeType: changeType, // Integer code that corresponds to stem change type
        specialForms: irrForms, //Object containing the special forms the verb takes
        english: eng // 2D array that holds each English translation in the form [infinitive, gerund, participle, preterite, imperfect subjunctive]
    }
}

// Wrap old representation into the new representation
function verbMaker(lst) {
    return buildVerb(lst[0], lst[1], lst[2], lst[4], lst[3])
}

// Old method that returns a list of attributes -- now wrapped into an object representation
function getAttributesOld(verb) {
    //form: [ar/er/ir, reflexive, stem change, {special forms}, [[infinitive, gerund, participle, pret, imp subj],[infinitive, etc.]]]
    switch(verb) {
        case "hablar":
            return verbMaker([0, false, 0, {}, [["talk", "talking", "talked", "talked", "talked"], ["speak", "speaking", "spoken", "spoke", "spoke"]]]);
        case "comer":
            return verbMaker([1, false, 0, {}, [["eat", "eating", "eaten", "ate", "ate"]]]);
        case "vivir":
            return verbMaker([2, false, 0, {}, [["live", "living", "lived", "lived", "lived"]]]);
        case "comenzar":
            return verbMaker([0, false, 1, {}, [["start", "starting", "started", "started", "started"], ["begin", "beginning", "begun", "began", "began"]]]);
        case "contar":
            return verbMaker([0, false, 3, {}, [["count", "counting", "counted", "counted", "counted"]]]);
        case "pensar":
            return verbMaker([0, false, 1, {}, [["think", "thinking", "thought", "thought", "thought"]]]);
        case "volver":
            return verbMaker([1, false, 3, {"participle":"vuelto"}, [["return", "returning", "returned", "returned", "returned"]]]);
        case "entender":
            return verbMaker([1, false, 1, {}, [["understand", "understanding", "understood", "understood", "understood"]]]);
        case "dormir":
            return verbMaker([2, false, 3, {}, [["sleep", "sleeping", "slept", "slept", "slept"]]]);
        case "pedir":
            return verbMaker([2, false, 2, {}, [["order", "ordering", "ordered", "ordered", "ordered"]]]);
        case "huir":
            return verbMaker([2, false, 0, {"boot":"huy", "gerund":"huyendo"}, [["escape", "escaping", "escaped", "escaped", "escaped"], ["flee", "fleeing", "fled", "fled", "fled"]]]);
        case "mentir":
            return verbMaker([2, false, 1, {}, [["lie", "lying", "lied", "lied", "lied"]]]);
        case "creer":
            return verbMaker([1, false, 0, {"participle":"creído", "gerund":"creyendo"}, [["believe", "believing", "believed", "believed", "believed"]]]);
        case "seguir":
            return verbMaker([2, false, 2, {"yo":"sig"}, [["follow", "following", "followed", "followed", "followed"]]]);
        case "andar":
            return verbMaker([0, false, 0, {"pret":["anduve", "anduviste", "anduvo", "anduvimos", "anduvieron"]}, [["walk", "walking", "walked", "walked", "walked"]]]);
        case "conducir":
            return verbMaker([2, false, 0, {"yo":"conduzc", "pret":["conduje", "condujiste", "condujo", "condujimos", "condujeron"]}, [["drive", "driving", "driven","drove", "drove"]]]);
        case "reír":
            return verbMaker([2, false, 2, {"future":"reir", "participle":"reído", "boot":"rí", "gerund":"riendo"}, [["laugh", "laughing", "laughed", "laughed", "laughed"]]]);
        case "caber":
            return verbMaker([1, false, 0, {"future":"cabr", "yo":"quep", "pret":["cupe", "cupiste", "cupo", "cupimos", "cupieron"]}, [["fit", "fitting", "fit", "fit", "fit"], ["fit", "fitting", "fitted", "fitted", "fitted"]]]);
        case "dar":
            return verbMaker([0, false, 0, {"pret":["di", "diste", "dio", "dimos", "dieron"], "subj":["dé", "des", "dé", "demos", "den", "deis"], "pres":["doy", "das", "da", "damos", "dan", "dais"]}, [["give", "giving", "given", "gave", "gave"]]]);
        case "caer":
            return verbMaker([1, false, 0, {"participle":"caído", "yo":"caig", "gerund":"cayendo"}, [["fall", "falling", "fallen", "fell", "fell"]]]);
        case "saber":
            return verbMaker([1, false, 0, {"future": "sabr", "pres":["sé", "sabes", "sabe", "sabemos", "saben", "sabéis"], "pret":["supe", "supiste", "supo", "supimos", "supieron"], "subj":["sepa", "sepas", "sepa", "sepamos", "sepan", "sepáis"]}, [["know", "knowing", "known", "found out", "knew"]]]);
        case "poner":
            return verbMaker([1, false, 0, {"yo":"pong", "future":"pondr", "participle":"puesto", "pret":["puse", "pusiste", "puso", "pusimos", "pusieron"], "command":"pon"}, [["put", "putting", "put", "put", "put"], ["place", "placing", "placed", "placed", "placed"], ["set", "setting", "set", "set", "set"]]]);
        case "hacer":
            return verbMaker([1, false, 0, {"yo":"hag", "future":"har", "participle":"hecho", "pret":["hice", "hiciste", "hizo", "hicimos", "hicieron"], "command":"haz"}, [["do", "doing", "done", "did", "did"], ["make", "making", "made", "made", "made"]]]);
        case "ir":
            return verbMaker([2, false, 0, {"pres":["voy", "vas", "va", "vamos", "van", "vais"], "pret":["fui", "fuiste", "fue", "fuimos", "fueron"], "subj":["vaya", "vayas", "vaya", "vayamos", "vayan", "vayáis"], "command":"ve", "gerund":"yendo", "imp":["iba", "ibas", "iba", "íbamos", "iban"], "nos":"vamos"}, [["go", "going", "gone", "went", "went"]]]);
        case "estar":
            return verbMaker([0, false, 0, {"pres":["estoy", "estás", "está", "estamos", "están", "estáis"], "pret":["estuve", "estuviste", "estuvo", "estuvimos", "estuvieron"], "subj":["esté", "estés", "esté", "estemos", "estén", "estéis"]}, [["be", "being", "been", "was", "were"]]]);
        case "tener":
            return verbMaker([1, false, 1, {"yo":"teng", "future":"tendr", "command":"ten", "pret":["tuve", "tuviste", "tuvo","tuvimos", "tuvieron"]}, [["have", "having", "had", "received", "had"], ["have", "having", "had", "got", "had"]]]);
        case "querer":
            return verbMaker([1, false, 1, {"pret":["quise", "quisiste", "quiso", "quisimos", "quisieron"], "future":"querr"}, [["want", "wanting", "wanted", "tried", "wanted"], ["want", "wanting", "wanted", "refused", "wanted"]]]);
        case "valer":
            return verbMaker([1, false, 0, {"future":"valdr", "command":"val", "yo":"valg"}, [["be worth", "being worth", "been worth", "was worth", "were worth"], ["cost", "costing", "cost", "costed", "costed"]]]);
        case "acostarse":
            return verbMaker([0, true, 3, {}, [["go to bed", "going to bed", "gone to bed", "went to bed"]]]);
        case "adquirir":
            return verbMaker([2, false, 0, {"boot":"adquier"}, [["buy", "buying", "bought", "bought"], ["acquire", "acquiring", "acquired", "acquired"]]]);
        case "atraer":
            return verbMaker([1, false, 0, {"yo":"atraig", "participle":"atraído", "gerund":"atrayendo", "pret":["atraje", "atrajiste", "atrajo", "atrajimos", "atrajeron"]}, [["attract", "attracting", "attracted", "attracted"]]]);
        case "conseguir":
            return verbMaker([2, false, 2, {"yo":"consig"}, [["obtain", "obtaining", "obtained", "obtained"], ["get", "getting", "gotten", "got"]]]);
        case "construir":
            return verbMaker([2, false, 0, {"boot":"contruy", "gerund":"construyendo"}, [["construct", "constructing", "constructed", "constructed"], ["build", "building", "built", "built"]]]);
        case "despedir":
            return verbMaker([2, false, 2, {}, [["fire", "firing", "fired", "fired"]]]);
        case "divertirse":
            return verbMaker([2, true, 1, {}, [["have fun", "having fun", "had fun", "had fun"]]]);
        case "escoger":
            return verbMaker([1, false, 0, {"yo":"escoj"}, [["choose", "choosing", "chosen", "chose"], ["select", "selecting", "selected", "selected"]]]);
        case "forzar":
            return verbMaker([0, false, 3, {}, [["force", "forcing", "forced", "forced"]]]);
        case "freír":
            return verbMaker([2, false, 2, {"boot":"frí", "participle":["frito", "freído"], "future":"freir", "gerund":"friendo"}, [["fry", "frying", "fried", "fried"]]]);
        case "elegir":
            return verbMaker([2, false, 2, {"yo":"elij"}, [["choose", "choosing", "chosen", "chose"], ["select", "selecting", "selected", "selected"]]]);
        case "medir":
            return verbMaker([2, false, 2, {}, [["measure", "measuring", "measured", "measured"]]]);
        case "morir":
            return verbMaker([2, false, 3, {"participle":"muerto"}, [["die", "dying", "died", "died"]]]);
        case "ofrecer":
            return verbMaker([1, false, 0, {"yo":"ofrezc"}, [["offer", "offering", "offered", "offered"]]]);
        case "portarse":
            return verbMaker([0, true, 0, {}, [["behave", "behaving", "behaved", "behaved"]]]);
        case "producir":
            return verbMaker([2, false, 0, {"yo":"produzc", "pret":["produje", "produjiste", "produjo", "produjimos", "produjeron"]}, [["produce", "producing", "produced", "produced"]]]);
        case "referir":
            return verbMaker([2, false, 1, {}, [["refer", "referring", "referred", "referred"]]]);
        case "reñir":
            return verbMaker([2, false, 2, {"pret":["reñí", "reñiste", "riñó", "reñimos", "riñeron"], "gerund":"riñendo"}, [["scold", "scolding", "scolded", "scolded"]]]);
        case "sentarse":
            return verbMaker([0, true, 1, {}, [["sit", "sitting", "sat", "sat"]]]);
        case "sonreír":
            return verbMaker([2, false, 2, {"future":"sonreir", "participle":"sonreído", "boot":"sonrí", "gerund":"sonriendo"}, [["smile", "smiling", "smiled", "smiled"]]]);
        case "sentirse":
            return verbMaker([2, true, 1, {}, [["feel", "feeling", "felt", "felt"]]]);
        case "sugerir":
            return verbMaker([2, false, 1, {}, [["suggest", "suggesting", "suggested", "suggested"]]]);
        case "torcer":
            return verbMaker([1, false, 3, {"yo":"tuerz", "participle":["torcido", "tuerto"]}, [["twist", "twisting", "twisted", "twisted"]]]);
        case "vestirse":
            return verbMaker([2, true, 2, {}, [["get dressed", "getting dressed", "gotten dressed", "got dressed"]]]);
        default:
            return null;
    }
}