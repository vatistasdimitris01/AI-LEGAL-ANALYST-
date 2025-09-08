
import { GoogleGenAI, Type } from "@google/genai";
import { type AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const articleSchema = {
    type: Type.OBJECT,
    properties: {
        article: {
            type: Type.STRING,
            description: "Το όνομα, ο αριθμός ή ο τίτλος του νομικού άρθρου ή νόμου (π.χ., 'Αστικός Κώδικας § 914').",
        },
        reasoning: {
            type: Type.STRING,
            description: "Μια λεπτομερής εξήγηση σε μορφή Markdown για το πώς ακριβώς αυτό το άρθρο εφαρμόζεται στα συγκεκριμένα γεγονότα της υπόθεσης και πώς μπορεί να χρησιμοποιηθεί στρατηγικά για την υποστήριξη της θέσης του μέρους.",
        },
        link: {
            type: Type.STRING,
            description: "Ένα έγκυρο URL αναζήτησης Google για το άρθρο ή το νόμο. Το ερώτημα πρέπει να είναι το ίδιο το άρθρο. Παράδειγμα: 'https://www.google.com/search?q=Αστικός+Κώδικας+§+914'"
        }
    },
    required: ["article", "reasoning"],
};

const schema = {
  type: Type.OBJECT,
  properties: {
    caseSummary: {
      type: Type.STRING,
      description: "Μια λεπτομερής περίληψη και ανάλυση της παρεχόμενης υπόθεσης σε μορφή Markdown. Καλύψτε τα βασικά σημεία, τις πιθανές δυνάμεις και τις αδυναμίες και για τις δύο πλευρές.",
    },
    plaintiffArticles: {
      type: Type.ARRAY,
      description: "Μια λίστα νομικών άρθρων, νόμων ή προηγουμένων που υποστηρίζουν την υπόθεση του ενάγοντος (ή της κατηγορίας).",
      items: articleSchema,
    },
    defendantArticles: {
      type: Type.ARRAY,
      description: "Μια λίστα νομικών άρθρων, νόμων ή προηγουμένων που υποστηρίζουν την υπόθεση του εναγομένου.",
      items: articleSchema,
    },
  },
  required: ["caseSummary", "plaintiffArticles", "defendantArticles"],
};


export const analyzeCase = async (caseDetails: string, country: string): Promise<AnalysisResult> => {
  const model = "gemini-2.5-flash";
  const systemInstruction = `Είσαι μια AI με εξειδίκευση στη νομική ανάλυση. Ο ρόλος σου είναι να εξετάσεις τις λεπτομέρειες της υπόθεσης που παρέχονται και να εκτελέσεις μια διεξοδική ανάλυση βασισμένη αυστηρά στους νόμους και τη δικαιοδοσία της χώρας: ${country}.
  
  Οδηγίες:
  1.  Η ανάλυση και η απάντησή σου πρέπει να είναι εξ ολοκλήρου στα Ελληνικά.
  2.  Διαμόρφωσε την περίληψη της υπόθεσης (caseSummary) και την αιτιολόγηση (reasoning) για κάθε άρθρο χρησιμοποιώντας Markdown για σαφήνεια (π.χ., επικεφαλίδες, λίστες, έντονη γραφή).
  3.  Εντόπισε και κατάγραψε σχετικά νομικά άρθρα από τη χώρα ${country} που θα υποστήριζαν τον ενάγοντα.
  4.  Εντόπισε και κατάγραψε σχετικά νομικά άρθρα από τη χώρα ${country} που θα υποστήριζαν τον εναγόμενο.
  5.  Όλοι οι νομικοί κώδικες και τα άρθρα πρέπει να είναι συγκεκριμένα για τη χώρα ${country}.
  6.  Διαμόρφωσε ολόκληρη την απάντησή σου ως ένα ενιαίο, έγκυρο αντικείμενο JSON που συμμορφώνεται με το παρεχόμενο σχήμα.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: caseDetails,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.5,
      },
    });

    const jsonText = response.text.trim();
    const sanitizedJsonText = jsonText.replace(/^```json\s*|```$/g, '');
    const result = JSON.parse(sanitizedJsonText) as AnalysisResult;
    
    if (!result.caseSummary || !result.plaintiffArticles || !result.defendantArticles) {
      throw new Error("Μη έγκυρη δομή απάντησης από την AI.");
    }

    return result;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Αποτυχία λήψης έγκυρης απάντησης από το μοντέλο AI.");
  }
};

export const searchLaws = async (query: string): Promise<string> => {
    const model = "gemini-2.5-flash";
    const prompt = `Εκτέλεσε μια αναζήτηση Google για το νομικό ερώτημα: "${query}".

    Οδηγίες Απάντησης:
    1.  Απάντησε αποκλειστικά στα Ελληνικά.
    2.  Παράθεσε ΜΟΝΟ το αποτέλεσμα της αναζήτησης, χωρίς εισαγωγικές φράσεις.
    3.  Διαμόρφωσε την απάντησή σου ΑΚΡΙΒΩΣ με την παρακάτω δομή Markdown:

    ## Αποτελέσματα για: "${query}"
    [Σε αυτό το σημείο, γράψε μια πολύ σύντομη περίληψη (1-2 προτάσεις) του άρθρου που βρέθηκε.]

    ### [Όνομα Κώδικα]: [Τίτλος Άρθρου]
    [Εδώ τοποθέτησε το πλήρες, μη επεξεργασμένο κείμενο του άρθρου. Διατήρησε την αρχική αρίθμηση και τις παραγράφους του πρωτότυπου κειμένου.]

    **Πηγή:** [URL_της_πηγής]

    ---
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API with search:", error);
        throw new Error("Αποτυχία αναζήτησης νόμων.");
    }
};

export const chatWithAI = async (query: string): Promise<string> => {
    const model = "gemini-2.5-flash";
    const prompt = `Είσαι ένας εξυπηρετικός νομικός βοηθός AI. Απάντησε στην ερώτηση του χρήστη.
    - Χρησιμοποίησε την Αναζήτηση Google αν χρειάζεσαι πρόσφατες ή συγκεκριμένες πληροφορίες.
    - Η απάντησή σου πρέπει να είναι αποκλειστικά στα Ελληνικά.
    - Χρησιμοποίησε Markdown για τη μορφοποίηση.
    
    Ερώτηση χρήστη: "${query}"`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for chat:", error);
        throw new Error("Αποτυχία λήψης απάντησης από το μοντέλο AI.");
    }
};

export const extractTextFromImage = async (base64Image: string): Promise<string> => {
    const model = 'gemini-2.5-flash';
    
    const parts = base64Image.match(/data:(.*);base64,(.*)/);
    if (!parts || parts.length < 3) {
        throw new Error("Invalid base64 image format");
    }
    const mimeType = parts[1];
    const imageData = parts[2];

    const imageDataPart = {
      inlineData: {
        mimeType,
        data: imageData,
      },
    };
    const textPart = {
        text: 'Ανάγνωσε και απόδωσε όλο το κείμενο από αυτή την εικόνα με ακρίβεια. Διατήρησε τις αρχικές αλλαγές γραμμής.'
    };

    const response = await ai.models.generateContent({
        model,
        contents: { parts: [imageDataPart, textPart] },
    });

    return response.text;
};

export const formatTextAsCase = async (rawText: string, source: string): Promise<string> => {
    const model = "gemini-2.5-flash";
    const prompt = `
    Είσαι ένας βοηθός AI που μετατρέπει άρθρα ειδήσεων σε συνοπτικές περιλήψεις νομικών υποθέσεων.
    
    Οδηγίες:
    1. Διάβασε το "Αρχικό κείμενο" που παρέχεται.
    2. Δημιούργησε μια "Περίληψη Υπόθεσης" που παρουσιάζει τα βασικά γεγονότα (ποιος, τι, πού, πότε) με σαφήνεια.
    3. Η περίληψη πρέπει να είναι ουδέτερη και να μην περιέχει νομική ανάλυση.
    4. Στο τέλος της περίληψης, πρόσθεσε την πηγή που σου δίνεται σε νέα γραμμή.
    5. Η απάντησή σου πρέπει να περιέχει ΜΟΝΟ την "Περίληψη Υπόθεσης" και την πηγή, ακολουθώντας πιστά το παράδειγμα.

    Παράδειγμα:
    ---
    Αρχικό κείμενο (παράδειγμα):
    "Τρεις αλλοδαποί (ηλικίας 25, 31 και 40 ετών) συνελήφθησαν στη Μύκονο για κατηγορίες διακεκριμένων κλοπών κατ’ εξακολούθηση και κατά συναυτουργία, καθώς επίσης για παράνομη παραμονή στη χώρα. Φέρονται να είχαν διαπράξει τρεις κλοπές σε τουριστικά καταλύματα μεταξύ 12 Ιουλίου και 1 Αυγούστου 2025, αφαιρώντας αντικείμενα και χρηματικά ποσά αξίας άνω των 200 000 €· μέρος των αντικειμένων αναγνωρίστηκε και επιστράφηκε στα θύματα."

    Πηγή (παράδειγμα):
    Pronews.gr

    Αποτέλεσμα (παράδειγμα):
Περίληψη Υπόθεσης

Μεταξύ 12 Ιουλίου και 1 Αυγούστου 2025 στη Μύκονο, τρεις αλλοδαποί διαπράττουν τρεις διακεκριμένες κλοπές σε τουριστικά καταλύματα, αφαιρώντας αντικείμενα και χρήματα συνολικής αξίας άνω των 200 000 €. Συνελήφθησαν ηλικίας 25, 31 και 40 ετών, ενώ μέρος των κλαπέντων αναγνωρίστηκε και επιστράφηκε στα θύματα. Επιπλέον, αντιμετωρίζουν κατηγορίες για παράνομη παραμονή στη χώρα.
Pronews.gr
    ---

    Τώρα, εφάρμοσε τις οδηγίες στην παρακάτω υπόθεση:

    Αρχικό κείμενο:
    ${rawText}

    Πηγή:
    ${source}
    `;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                temperature: 0.2,
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API for case formatting:", error);
        throw new Error("Αποτυχία διαμόρφωσης του κειμένου σε υπόθεση.");
    }
};