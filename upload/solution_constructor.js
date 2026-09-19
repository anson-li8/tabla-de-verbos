// Main logic that constructs a solution for each box and then displays it 
// based on current selected verb and for the specified subject

function getSolution(sujeto) {
    let verbo = document.getElementById("verbSelector").value;
    let attr = getAttributes(verbo); //Guiding attributes for the verb
    let plain_verb;

    if(attr.isReflexive) {
        plain_verb = verbo.substring(0, verbo.length - 2);
    } else {
        plain_verb = verbo;
    }
    var stem = plain_verb.substring(0, plain_verb.length - 2);

    var spanish = [];

    //infinitive
    var infin = plain_verb;
    if(attr.isReflexive) {
        infin += reflexive_pronouns[sujeto];
    }
    spanish.push(infin);

    //gerund
    var ger;
    if(attr.specialForms["gerund"] == null) {
        if(attr.endingType == IR && attr.stemChangeType != NO_SC) {
            ger = stemChange(stem, attr.stemChangeType, true);
        } else {
            ger = stem;
        }
        if(attr.endingType == AR) {
            if(attr.isReflexive) {
                ger = [ger + "ándo" + reflexive_pronouns[sujeto], reflexive_pronouns[sujeto] + " - " + ger + "ando"];
            } else {
                ger += "ando";
            }
        } else {
            if(attr.isReflexive) {
                ger = [ger + "iéndo" + reflexive_pronouns[sujeto], reflexive_pronouns[sujeto] + " - " + ger + "iendo"];
            } else {
                ger += "iendo";
            }
        }
    } else {
        ger = attr.specialForms["gerund"];
    }
    spanish.push(ger);

    //participle
    var part;
    if(attr.specialForms["participle"] == null) {
        if(attr.endingType == AR) {
            part = stem + "ado";
        } else {
            part = stem + "ido";
        }
        if(attr.isReflexive) {
            part = reflexive_pronouns[sujeto] + " - " + part;
        }
    } else {
        part = attr.specialForms["participle"];
        if(part instanceof Array) {
            part = part[0];
        }
    }
    spanish.push(part);

    //present
    var pres;
    if(attr.specialForms["pres"] != null) {
        pres = attr.specialForms["pres"][sujeto];
    }
    else { 
        if(sujeto == NOSOTROS) {
            if(attr.endingType == IR && stem.substring(stem.length - 1) == "e") {
                pres = stem + "ímos";
            } else {
                pres = stem + pres_endings[attr.endingType][sujeto];
            }
        } else if(sujeto == YO) {
            pres = getYo(stem, attr);
        }else {
            if(attr.specialForms["boot"] == null) {
                pres = stemChange(stem, attr.stemChangeType, false) + pres_endings[attr.endingType][sujeto];    
            } else {
                pres = attr.specialForms["boot"] + pres_endings[attr.endingType][sujeto];
            }
        }
    }
    if(attr.isReflexive) {
        pres = reflexive_pronouns[sujeto] + " " + pres;
    }
    spanish.push(pres);

    //imperfect
    var imp;
    if(attr.specialForms["imp"] != null) {
        imp = attr.specialForms["imp"][sujeto];
    } else {
        var suj_idx = attr.endingType == AR? 0:1;
        imp = stem + imp_endings[suj_idx][sujeto];
        if(attr.isReflexive) {
            imp = reflexive_pronouns[sujeto] +" "+ imp;
        }
    }
    spanish.push(imp);

    //pret
    var pret;
    if(sujeto == EL || sujeto == ELLOS) {
        pret = getEllos(stem, attr, sujeto);
        if(attr.isReflexive) {
            pret = "se " + pret;
        }
    } else {
        if(attr.specialForms["pret"] == null) {
            if(sujeto == YO && attr.endingType == AR) {
                if(stem.substring(stem.length - 1) == "z") {
                    pret = stem.substring(0, stem.length - 1) + "c" + pret_endings[suj_idx][sujeto];
                } else if(stem.substring(stem.length - 1) == "g") {
                    pret = stem.substring(0, stem.length - 1) + "gu" + pret_endings[suj_idx][sujeto];
                } else if(stem.substring(stem.length - 1) == "c") {
                    pret = stem.substring(0, stem.length - 1) + "qu" + pret_endings[suj_idx][sujeto];
                } else {
                    pret = stem + pret_endings[suj_idx][sujeto];
                }
            } else if(suj_idx == 1 && (stem.substring(stem.length - 1) == "e") || stem.substring(stem.length - 1) == "a") {
                var ending = pret_endings[suj_idx][sujeto];
                ending = "í" + ending.substring(1);
                pret = stem + ending;
            } else {
                pret = stem + pret_endings[suj_idx][sujeto];
            }
        } else {
            pret = attr.specialForms["pret"][sujeto];
        }
        if(attr.isReflexive) {
            pret = reflexive_pronouns[sujeto] +" "+ pret;
        }
    }
    spanish.push(pret);

    //present perfect
    if(attr.isReflexive) {
        spanish.push(part.replace("-", haber_pres[sujeto]));
    } else {
        spanish.push(haber_pres[sujeto] + " " + part);
    }

    //pluperfect
    if(attr.isReflexive) {
        spanish.push(part.replace("-", "hab" + imp_endings[1][sujeto]));
    } else {
        spanish.push("hab" + imp_endings[1][sujeto] + " " + part);
    }

    //future
    var fut;
    if(attr.specialForms["future"] == null) {
        fut = plain_verb + fut_endings[sujeto];
    } else {
        fut = attr.specialForms["future"] + fut_endings[sujeto];
    }
    if(attr.isReflexive) {
        fut = reflexive_pronouns[sujeto] + " " + fut;
    }
    spanish.push(fut);

    //fut perf
    if(attr.isReflexive) {
        spanish.push(part.replace("-", "habr" + fut_endings[sujeto]));
    } else {
        spanish.push("habr" + fut_endings[sujeto] + " " + part);
    }

    //cond
    var cond;
    if(attr.specialForms["future"] == null) {
        cond = plain_verb + imp_endings[1][sujeto];
    } else {
        cond = attr.specialForms["future"] + imp_endings[1][sujeto];
    }
    if(attr.isReflexive) {
        cond = reflexive_pronouns[sujeto] + " " + cond;
    }
    spanish.push(cond);

    //cond perf
    if(attr.isReflexive) {
        spanish.push(part.replace("-", "habr" + imp_endings[1][sujeto]));
    } else {
        spanish.push("habr" + imp_endings[1][sujeto] + " " + part);
    }

    //pres subj
    spanish.push(getPresSubj(stem, attr, sujeto));

    //imp subj
    var imp_subj = getEllos(stem, attr, ELLOS);
    imp_subj = imp_subj.substring(0, imp_subj.length - 3);
    if(attr.isReflexive) {
        imp_subj = reflexive_pronouns[sujeto] + " " + imp_subj;
    }
    if(sujeto == NOSOTROS) {
        imp_subj = addAccent(imp_subj + " ").substring(0, imp_subj.length);
    }
    spanish.push([imp_subj + imp_subj_endings[0][sujeto], imp_subj + imp_subj_endings[1][sujeto]]);

    //pres. perf subj
    if(attr.isReflexive) {
        spanish.push(part.replace("-", haber_subj[sujeto]));
    } else {
        spanish.push(haber_subj[sujeto] + " " + part);
    }

    //pluperf subj
    if(attr.isReflexive) {
        spanish.push([part.replace("-", haber_imp_subj[0][sujeto]), part.replace("-", haber_imp_subj[1][sujeto])]);
    } else {
        spanish.push([haber_imp_subj[0][sujeto] + " " + part, haber_imp_subj[1][sujeto] + " " + part]);
    }

    // Tu +
    var tup;
    if(attr.specialForms["command"] != null) {
        tup = attr.specialForms["command"];
    }
    else if(attr.specialForms["pres"] != null) {
        tup = attr.specialForms["pres"][2];
    }
    else {
        if(attr.specialForms["boot"] == null) {
            tup = stemChange(stem, attr.stemChangeType, false);    
        } else {
            tup = attr.specialForms["boot"];
        }
        if(attr.isReflexive) {
            tup = addAccent(tup);
            tup += pres_endings[attr.endingType][2] + reflexive_pronouns[1];
        } else {
            tup += pres_endings[attr.endingType][2];
        }
    }
    spanish.push([tup, "¡" + tup + "!"]);

    //tun
    spanish.push(["no " + getPresSubj(stem, attr, 1), "¡" + "no " + getPresSubj(stem, attr, 1) + "!"]);

    //ud
    var base_ud = getPresSubj(stem, attr, 2);
    if(attr.isReflexive) {
        var temp = base_ud.substring(base_ud.length - 1);
        base_ud = base_ud.substring(3, base_ud.length - 1);
        base_ud = addAccent(base_ud) + temp + "se";
    }
    spanish.push([base_ud, "¡" + base_ud + "!"]);

    //uds
    var base_uds = getPresSubj(stem, attr, 4);
    if(attr.isReflexive) {
        var temp = base_uds.substring(base_uds.length - 2);
        base_uds = base_uds.substring(3, base_uds.length - 2);
        base_uds = addAccent(base_uds) + temp + "se";
    }
    spanish.push([base_uds, "¡" + base_uds + "!"]);

    //vosotros
    var vosn = "no " + getPresSubj(stem, attr, 5);
    var vosp = plain_verb.substring(0, plain_verb.length - 1) + "d";
    if(attr.isReflexive) {
        if(attr.endingType == IR) {
            vosp = vosp.substring(0, vosp.length - 2) + "íos";
        } else {
            vosp = vosp.substring(0, vosp.length - 1) + "os";
        }
    }
    spanish.push([vosn, vosp, "¡" + vosn + "!", "¡" + vosp + "!"]);
    spanish.push([vosp, vosn, "¡" + vosp + "!", "¡" + vosn + "!"]);

    //nosotros
    var nosotros;
    if(attr.specialForms["nos"] != null) {
        nosotros = attr.specialForms["nos"];
    } else {
        nosotros = getPresSubj(stem, attr, 3);
        if(attr.isReflexive) {
            nosotros = nosotros.substring(4, nosotros.length - 3);
            if(nosotros.substring(nosotros.length - 1) == "a") {
                nosotros = nosotros.substring(0, nosotros.length - 1) + "ámonos";
            } else if(nosotros.substring(nosotros.length - 1) == "e") {
                nosotros = nosotros.substring(0, nosotros.length - 1) + "émonos";
            }
        }
    }
    spanish.push([nosotros, "¡" + nosotros + "!"]);
    
    for(var i = 0; i < spanish.length; i++) {
        var obj = spanish[i];
        if(!(obj instanceof Array)) {
            obj = [obj];
        }
        if(attr.specialForms["participle"] != null && attr.specialForms["participle"] instanceof Array) {
            for(var j = 0; j < obj.length; j++) {
                if(obj[j].includes(attr.specialForms["participle"][0])) {
                    obj.push(obj[j].replace(attr.specialForms["participle"][0], attr.specialForms["participle"][1]));
                }
            }
        }
        spanish[i] = obj;
    }

    //Then construct the english
    var english = [];
    for(var i = 0; i < 23; i++) {
        english.push([]);
    }
    for(var i = 0; i < attr.english.length; i++) {
        var curr_ops = attr.english[i];
        var be = false;
        var go = false;
        var have = false;
        var space = false;
        if(curr_ops[0] == "be worth" || curr_ops[0] == "be") {
            be = true;
        } else if(curr_ops[0] == "go to bed" || curr_ops[0] == "go") {
            go = true;
        } else if(curr_ops[0] == "have" || curr_ops[0] == "have fun") {
            have = true;
        } else if(curr_ops[0].indexOf(" ") != -1) {
            space = true;
        }
        english[0].push(new RegExp("^" + "to " + curr_ops[0] + "$"));
        english[1].push(new RegExp("^" + curr_ops[1] + "$"));
        english[2].push(new RegExp("^" + curr_ops[2] + "$"));
        if(go) {
            if(sujeto == EL) {
                english[3].push(new RegExp("^" + e_subs[sujeto] + " goes" + curr_ops[0].substring(2) + "$"));
            } else {
                english[3].push(new RegExp("^" + e_subs[sujeto] + " " + curr_ops[0] + "$"));
            }
        } else if(have) {
            if(sujeto == EL) {
                english[3].push(new RegExp("^" + e_subs[sujeto] + " has" + curr_ops[0].substring(4) + "$"));
            } else {
                english[3].push(new RegExp("^" + e_subs[sujeto] + " " + curr_ops[0] + "$"));
            }
        } else if(space) {
            if(sujeto == EL) {
                english[3].push(new RegExp("^" + e_subs[sujeto] + " " + curr_ops[0].substring(0, curr_ops[0].indexOf(" ")) + "s" + curr_ops[0].substring(curr_ops[0].indexOf(" ")) + "$"));
            } else {
                english[3].push(new RegExp("^" + e_subs[sujeto] + " " + curr_ops[0] + "$"));
            }
        } else {
            if(sujeto == YO && be) {
                english[3].push(new RegExp("^" + e_subs[sujeto] + " am" + curr_ops[0].substring(2) + "$"));
            } else if(sujeto == EL) {
                if(be) {
                    english[3].push(new RegExp("^" + e_subs[sujeto] + " is" + curr_ops[0].substring(2) + "$"));
                } else {
                    english[3].push(new RegExp("^" + e_subs[sujeto] + " " + curr_ops[0] + "s" + "$"));
                }
            } else if(be && (sujeto == TU || sujeto == NOSOTROS || sujeto == ELLOS)) {
                english[3].push(new RegExp("^" + e_subs[sujeto] + " are" + curr_ops[0].substring(2) + "$"));
            } else {
                english[3].push(new RegExp("^" + e_subs[sujeto] + " " + curr_ops[0] + "$"));
            }
        }
        
        english[4].push(new RegExp("^" + e_subs[sujeto] + " used to " + curr_ops[0] + "$"));
        if(!be) {    
            if(sujeto == YO || sujeto == EL) {
                english[4].push(new RegExp("^" + e_subs[sujeto] + " was " + curr_ops[1] + "$"));
            } else {
                english[4].push(new RegExp("^" + e_subs[sujeto] + " were " + curr_ops[1] + "$"));
            }
        }
        if(be && (sujeto == TU || sujeto == NOSOTROS || sujeto == ELLOS)) {
            english[5].push(new RegExp("^" + e_subs[sujeto] + " were" + curr_ops[0].substring(2) + "$"))
        } else {
            english[5].push(new RegExp("^" + e_subs[sujeto] + " " + curr_ops[3] + "$"));
        }
        if(sujeto != EL) {
            english[6].push(new RegExp("^" + e_subs[sujeto] + " have " + curr_ops[2] + "$"));
        } else {
            english[6].push(new RegExp("^" + e_subs[sujeto] + " has " + curr_ops[2] + "$"));
        }
        english[7].push(new RegExp("^" + e_subs[sujeto] + " had " + curr_ops[2] + "$"));
        english[8].push(new RegExp("^" + e_subs[sujeto] + " will " + curr_ops[0] + "$"));
        english[9].push(new RegExp("^" + e_subs[sujeto] + " will have " + curr_ops[2] + "$"));
        english[10].push(new RegExp("^" + e_subs[sujeto] + " would " + curr_ops[0] + "$"));
        english[11].push(new RegExp("^" + e_subs[sujeto] + " would have " + curr_ops[2] + "$"));
        english[11].push(new RegExp("^" + e_subs[sujeto] + " would.ve " + curr_ops[2] + "$"));
        english[12].push(new RegExp("^" + "that " + e_subs[sujeto] + " " + curr_ops[0] + "$"));
        if(!be) {
            english[13].push(new RegExp("^" + "that " + e_subs[sujeto] + " were " + curr_ops[1] + "$"));
        }
        if(curr_ops[4] != null) {
            english[13].push(new RegExp("^" + "that " + e_subs[sujeto] + " " + curr_ops[4] + "$"));
        } else {
            english[13].push(new RegExp("^" + "that " + e_subs[sujeto] + " " + curr_ops[3] + "$"))
        }
        english[14].push(new RegExp("^" + "that " + e_subs[sujeto] + " have " + curr_ops[2] + "$"));
        english[15].push(new RegExp("^" + "that " + e_subs[sujeto] + " had " + curr_ops[2] + "$"));
        english[16].push(new RegExp("^" + curr_ops[0] + "!?" + "$"));
        english[17].push(new RegExp("^" + "don.t " + curr_ops[0] + "!?" + "$"));
        english[18].push(new RegExp("^" + curr_ops[0] + "!?" + "$"));
        english[19].push(new RegExp("^" + curr_ops[0] + "!?" + "$"));
        english[20].push(new RegExp("^" + "\\(don.t\\) " + curr_ops[0] + "!?" + "$"));
        english[20].push(new RegExp("^" + "don.t " + curr_ops[0] + "/" + curr_ops[0] + "!?" + "$"));
        english[20].push(new RegExp("^" + curr_ops[0] + "/" + "don.t " + curr_ops[0] + "!?" + "$"));
        english[22].push(new RegExp("^" + "let.s " + curr_ops[0] + "!?" + "$"));
    }
    var order = ["inf", "ger", "part_pas", "pres", "imp", "pret", "pres_perf", "plu_perf", "fut", "fut_perf", "cond", "cond_perf", "pres_subj", 
    "imp_subj", "pres_perf_subj", "plu_perf_subj", "tu_pos", "tu_neg", "ud", "uds", "vos", "vos", "nos"];

    var changed = false;
    for(var i = 0; i < order.length; i++) {
        var span_name = order[i];
        switch(i) {
            case 20:
                span_name += "_one_spanish";
                break;
            case 21:
                span_name += "_two_spanish";
                break;
            default:
                span_name +="_spanish";
                break;
        }
        var eng_name = order[i] + "_ingles";
        var span_ans = document.getElementById(span_name).value;
        var eng_ans = document.getElementById(eng_name).value;
        
        document.getElementById(span_name).style.color = "black"
        if(i != 21)
            document.getElementById(eng_name).style.color = "black"

        span_ans = span_ans == null? "" : span_ans.toLowerCase().trim();
        eng_ans = eng_ans == null? "" : eng_ans.toLowerCase().trim();

        if(span_ans == "" || !spanish[i].includes(span_ans)) {
            var most_similar;
            do {
                most_similar = getMostSimilar(span_ans, spanish[i]);
                spanish[i] = spanish[i].filter(item => item != most_similar)
            } while(i == 21 && document.getElementById("vos_one_spanish").value.indexOf(most_similar) != -1 && spanish[i].length > 0)
            document.getElementById(span_name).value += " **" + most_similar + "**";
            document.getElementById(span_name).style.color = "red";
            changed = true;
        }
        if(i != 21 && (eng_ans == "" || !english[i].some(elem => elem.test(eng_ans)))) {
            document.getElementById(eng_name).value += " **" + getMostSimilar(eng_ans, english[i]) + "**";
            document.getElementById(eng_name).style.color = "red";
            changed = true;
        }
    }
    if(!changed) {
        alert("¡Perfecto!");
    }
}

// Get the most similar answer from the list given the (erroneous) input
function getMostSimilar(input, answers) {
    var minDist = 999;
    var minIdx = -1;
    var minLength = 999;
    for(var i = 0; i < answers.length; i++) {
        var curr_ans;
        if(answers[i] instanceof RegExp) {
            curr_ans = cleanString(answers[i].source);
        } else  {
            curr_ans = answers[i];
        }
        if(curr_ans.length < minLength) {
            minLength = curr_ans.length;
        }
        var sim_score = similarity(curr_ans, input);
        if(sim_score < minDist) {
            minDist = sim_score;
            minIdx = i;
        }
    }
    if(minDist == minLength)  {
        return answers[0] instanceof RegExp? cleanString(answers[0].source) : answers[0];
    } else {
        return answers[minIdx] instanceof RegExp? cleanString(answers[minIdx].source) : answers[minIdx];
    }
}

// Convert the regex template to a string we can display to the user
function cleanString(str) {
    return str.replace(".", "'").replace("?", "").replace(/\\/g, "").replace("^", "").replace("$", "");
}

// Return how many changes are needed to make the strings the same (Levenshtein distance)
function similarity(str1, str2) {
    
    let dp = [];
    for (let i = 0; i <= str1.length; i++) {
        dp[i] = [i];
    }
    for (let j = 0; j <= str2.length; j++) {
        dp[0][j] = j;
    }

    
    for (let i = 1; i <= str1.length; i++) {
        for (let j = 1; j <= str2.length; j++) {
            let cost = (str1.charAt(i - 1) == str2.charAt(j - 1)) ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,     
                dp[i][j - 1] + 1,     
                dp[i - 1][j - 1] + cost  
            );
        }
    }
    
    return dp[str1.length][str2.length];
}

// Add an accent to the last vowel of the word fragment
function addAccent(word) {
    var tup = word;
    for(var i = tup.length - 1; i >= 0; i--) {
        if(tup.substring(i, i+1) == "a") {
            tup = tup.substring(0,i) + "á" + tup.substring(i+1);
            break;
        } else if(tup.substring(i, i+1) == "e") {
            tup = tup.substring(0,i) + "é" + tup.substring(i+1);
            break;
        } else if(tup.substring(i, i+1) == "i") {
            tup = tup.substring(0,i) + "í" + tup.substring(i+1);
            break;
        } else if(tup.substring(i, i+1) == "o") {
            tup = tup.substring(0,i) + "ó" + tup.substring(i+1);
            break;
        } else if(tup.substring(i, i+1) == "u") {
            tup = tup.substring(0,i) + "ú" + tup.substring(i+1);
            break;
        }
    }
    return tup;
}

// Get the present subjunctive for a given verb and subject
function getPresSubj(stem, attr, sujeto1) {
    var pres_subj;
    var opp = attr.endingType == AR? 1:0;
    let suj = sujeto1 == YO? 2:sujeto1;
    if(attr.specialForms["subj"] != null) {
        return attr.specialForms["subj"][suj];
    }
    if(suj == NOSOTROS || suj == VOSOTROS) {
        pres_subj = getYo(stem, attr);
        pres_subj = pres_subj.substring(0, pres_subj.length - 1);
        if(attr.stemChangeType != NO_SC || stem == "adquir")  {
            var find;
            var change;
            for(var i = 0; i < pres_subj.length; i++) {
                if(pres_subj.substring(i, i+1) == "í") {
                    pres_subj = pres_subj.substring(0,i) + "i" + pres_subj.substring(i+1);
                }
            }
            if(attr.endingType != IR) {
                if(attr.stemChangeType == E_IE) {
                    find = "ie";
                    change = "e";
                }
                else if(attr.stemChangeType == E_I) {
                    find = "i";
                    change = "e";
                }
                else if(attr.stemChangeType == O_UE) {
                    find = "ue";
                    change = "o";
                }
            } else {
                if(attr.stemChangeType == E_IE) {
                    find = "ie";
                    change = "i";
                }
                else if(attr.stemChangeType == E_I) {
                    find = "i";
                    change = "i";
                }
                else if(attr.stemChangeType == O_UE) {
                    find = "ue";
                    change = "u";
                }  else if(stem == "adquir") {
                    find = "ie";
                    change = "i";
                }
            }
            for(var i = 0; i < pres_subj.length - 1; i++) {
                var look = pres_subj.substring(pres_subj.length - i - find.length, pres_subj.length - i);
                if(look == find) {
                    pres_subj = pres_subj.substring(0, pres_subj.length - i - find.length) + change + pres_subj.substring(pres_subj.length - i);
                    break;
                }
            }
        }
        pres_subj += pres_endings[opp][suj];
    } else {
        pres_subj = getYo(stem, attr);
        pres_subj = pres_subj.substring(0, pres_subj.length - 1) + pres_endings[opp][suj];
    }
    if(attr.isReflexive) {
        pres_subj = reflexive_pronouns[sujeto1] + " " + pres_subj;
    }
    if(attr.endingType == AR) {
        var ending = pres_endings[opp][suj];
        var inspect = pres_subj.substring(pres_subj.length - ending.length - 1, pres_subj.length - ending.length);
        if(inspect == "c") {
            pres_subj = pres_subj.substring(0, pres_subj.length - ending.length - 1) + "qu" + pres_subj.substring(pres_subj.length - ending.length);
        } else if(inspect == "g") {
            pres_subj = pres_subj.substring(0, pres_subj.length - ending.length - 1) + "gu" + pres_subj.substring(pres_subj.length - ending.length);
        } else if(inspect == "z") {
            pres_subj = pres_subj.substring(0, pres_subj.length - ending.length - 1) + "c" + pres_subj.substring(pres_subj.length - ending.length);
        }
    }
    return pres_subj;
}

// Gets the stem for the third person preterite conjugation and attaches the correct ending based on plural or singular
function getEllos(stem, attr, sujeto1) {
    var pret;
    var idx = sujeto1 == EL? 3:6;
    var suj_idx = attr.endingType == AR? 0:1;
    if(attr.endingType == IR) {
        pret = stemChange(stem, attr.stemChangeType, true) + pret_endings[suj_idx][sujeto1];
    } else {
        pret = stem + pret_endings[suj_idx][sujeto1];
    }
    if(suj_idx == 1) {
        var start = pret.length - idx;
        var end = pret.length - idx + 1;
        if(pret.substring(start, end) == "i") {
            pret = pret.substring(0, start) + pret.substring(end);
        } else if(pret.substring(start, end) == "a" || pret.substring(start, end) == "e" || pret.substring(start, end) == "u" && 
                pret.substring(start - 1, start) != "q" && pret.substring(start-1, start) != "g") {
            pret = pret.substring(0, pret.length - idx + 1) + "y" + pret.substring(pret.length - idx + 2);
        }
    }
    if(attr.specialForms["pret"] != null) {
        pret = attr.specialForms["pret"][sujeto1];
    }

    return pret;
}

// Get the 1st person singular conjugation of the verb in the present tense 
function getYo(stem, attr) {
    var tbr;
    if(attr.specialForms["yo"] == null) {
        if(attr.specialForms["boot"] == null) {
            tbr= stemChange(stem, attr.stemChangeType, false) + "o";
        } else {
            tbr= attr.specialForms["boot"] + "o";
        }
    } else {
        tbr= attr.specialForms["yo"] + "o";
    }
    return tbr;
}

// Stem change the given verb stem
function stemChange(stem, type, oneLetter) {
    if(type == NO_SC) {
        return stem;
    }
    var tbr;
    var i;
    for(i = stem.length - 1; i >= 0; i--) {
        if(stem.substring(i, i+1) == "e") {
            if(type == E_IE) {
                if(oneLetter) {
                    tbr = stem.substring(0,i) + "i";
                    break;
                } else {
                    tbr = stem.substring(0,i) + "ie";
                    break
                }
            } else if(type == E_I) {
                tbr = stem.substring(0,i) + "i";
                break;
            }
        } else if(stem.substring(i, i+1) == "o") {
            if(type == O_UE) {
                if(oneLetter) {
                    tbr = stem.substring(0,i) + "u";
                    break;
                } else {
                    tbr = stem.substring(0,i) + "ue";
                    break;
                }
            }
        }
    }
    if(i != stem.length-1) {
        tbr += stem.substring(i+1);
    }
    return tbr;
}