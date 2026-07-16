// ==========================================
// 🛠️ CONFIGURATION
// ==========================================
const MY_TELEGRAM_USERNAME = "elyas_ik"; 

// Update these with your Supabase keys to make it live!
const SUPABASE_URL = "https://your-project-id.supabase.co"; 
const SUPABASE_ANON_KEY = "your-actual-anon-public-key";

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Mock catalog data for instant testing
let listings = [
  { id: 101, platform: "TikTok", name: "@gaming_zone", followers: "45k", price: 800 },
  { id: 102, platform: "YouTube", name: "TechBytes", followers: "12k", price: 1600 },
  { id: 103, platform: "Telegram", name: "@ethio_market", followers: "8.5k", price: 400 }
];

// ==========================================
// 🔒 GATE CONTROL: SIGNUP & AUTHENTICATION
// ==========================================

// Triggered when user enters email and password
async function handleAuthSignUp(event) {
  event.preventDefault();
  const emailInput = document.getElementById("gate-email").value;
  const passwordInput = document.getElementById("gate-password").value;

  try {
    // 1. Attempt real registration through Supabase database
    const { data, error } = await supabase.auth.signUp({
      email: emailInput,
      password: passwordInput
    });

    if (error) throw error;

    // Send them to the "Check Email" verification screen
    showVerificationScreen(emailInput);

  } catch (err) {
    console.warn("Real Auth failed or Supabase not linked yet. Simulating auth...");
    // Local simulation in case keys aren't set yet (perfect for CodePen)
    showVerificationScreen(emailInput);
  }
}

function showVerificationScreen(email) {
  document.getElementById("auth-gate").classList.add("hidden");
  document.getElementById("registered-email").innerText = email;
  document.getElementById("verify-gate").classList.remove("hidden");
}

// Bypasses verification screen (Used for testing locally or when keys aren't live)
function simulateSuccessfulVerification() {
  document.getElementById("verify-gate").classList.add("hidden");
  document.getElementById("main-portal").classList.remove("hidden");
  loadListings();
}

// Monitor actual email verification dynamically (If Supabase is connected)
async function checkAuthSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // User is verified and logged in! Skip sign up screens.
      document.getElementById("auth-gate").classList.add("hidden");
      document.getElementById("verify-gate").classList.add("hidden");
      document.getElementById("main-portal").classList.remove("hidden");
      loadListings();
    }
  } catch (err) {}
}

// ==========================================
// 📊 BUSINESS LOGIC & COMMISSIONS
// ==========================================
function getEliasCommission(price) {
  if (price < 500) return 100;
  if (price >= 500 && price < 1000) return 150;
  if (price >= 1000 && price < 1500) return 200;
  return 250; 
}

function calculateLiveCommission() {
  const inputPrice = Number(document.getElementById("price").value);
  const calcComm = document.getElementById("calc-comm");
  const calcPayout = document.getElementById("calc-payout");

  if (!inputPrice || inputPrice <= 0) {
    calcComm.innerText = "0 ETB";
    calcPayout.innerText = "0 ETB";
    return;
  }

  const commission = getEliasCommission(inputPrice);
  const payout = inputPrice - commission;

  calcComm.innerText = `${commission} ETB`;
  calcPayout.innerText = `${payout > 0 ? payout : 0} ETB`;
}

// ==========================================
// 💾 MARKETPLACE ACTIONS & DB LOADING
// ==========================================
async function loadListings() {
  const container = document.getElementById("listings-container");
  container.innerHTML = "";

  try {
    const { data: dbData, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !dbData) throw new Error("Load local fallback.");
    renderListings(dbData);
  } catch (err) {
    renderListings(listings);
  }
}

function renderListings(dataList) {
  const container = document.getElementById("listings-container");
  container.innerHTML = "";
  
  dataList.forEach(item => {
    container.innerHTML += `
      <div class="listing-card">
        <div>
          <span class="badge">${item.platform}</span>
          <h4 style="margin: 8px 0 2px 0">${item.name}</h4>
          <small style="color: var(--text-sub)">${item.followers} Followers</small>
        </div>
        <div style="text-align: right">
          <div style="font-weight: bold; color: var(--accent); margin-bottom: 5px">${item.price} ETB</div>
          <button class="listing-buy-btn" onclick="buyAsset('${item.platform}', '${item.name}', ${item.price})">Buy</button>
        </div>
      </div>
    `;
  });
}

async function handleFormSubmit(event) {
  event.preventDefault();
  
  const platform = document.getElementById("platform").value;
  const name = document.getElementById("channel-name").value;
  const followersNum = Number(document.getElementById("followers").value);
  const rawPrice = Number(document.getElementById("price").value);
  const formattedFollowers = followersNum >= 1000 ? (followersNum/1000).toFixed(0) + "k" : followersNum;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('listings').insert([{ platform, name, followers: formattedFollowers, price: rawPrice, user_id: session.user.id }]);
    } else {
      listings.unshift({ id: Date.now(), platform, name, followers: formattedFollowers, price: rawPrice });
    }
  } catch(e) {
    listings.unshift({ id: Date.now(), platform, name, followers: formattedFollowers, price: rawPrice });
  }

  document.getElementById("sell-form").reset();
  calculateLiveCommission();
  loadListings();
  alert("Listing submitted successfully!");
}

function buyAsset(platform, name, price) {
  const message = `Hi Elias! I want to buy the ${platform} account: ${name}. I am ready to pay ${price} ETB securely through you.`;
  window.open(`https://t.me/${MY_TELEGRAM_USERNAME}?text=${encodeURIComponent(message)}`, "_blank");
}

// Auto-check session on page load
window.addEventListener('load', checkAuthSession);
