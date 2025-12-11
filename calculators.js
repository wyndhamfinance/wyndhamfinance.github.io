// ==========================================
// WYNDHAM FINANCIAL GROUP - Calculator Functions
// ==========================================

// ==========================================
// BORROWING CAPACITY CALCULATOR
// ==========================================
function calculateBorrowing() {
    const annualIncome = parseFloat(document.getElementById('annualIncome').value) || 0;
    const partnerIncome = parseFloat(document.getElementById('partnerIncome').value) || 0;
    const monthlyExpenses = parseFloat(document.getElementById('monthlyExpenses').value) || 0;
    const existingLoans = parseFloat(document.getElementById('existingLoans').value) || 0;
    const dependents = parseInt(document.getElementById('dependents').value) || 0;
    const interestRate = parseFloat(document.getElementById('interestRate').value) || 6.5;

    // Combined gross income
    const totalIncome = annualIncome + partnerIncome;
    const monthlyIncome = totalIncome / 12;

    // Calculate net monthly income (rough tax estimate)
    const taxRate = calculateTaxRate(totalIncome);
    const netMonthlyIncome = monthlyIncome * (1 - taxRate);

    // Dependent allowance ($400/month per dependent)
    const dependentAllowance = dependents * 400;

    // Available monthly income for loan
    const availableIncome = netMonthlyIncome - monthlyExpenses - existingLoans - dependentAllowance;

    // Lenders typically use 30% of gross income or 80% of surplus
    const maxMonthlyRepayment = Math.min(availableIncome * 0.8, monthlyIncome * 0.35);

    if (maxMonthlyRepayment <= 0) {
        document.getElementById('borrowingValue').textContent = '$    0';
        document.getElementById('borrowingResult').style.display = 'block';
        return;
    }

    // Calculate maximum loan using monthly repayment
    // P = PMT × ((1 - (1 + r)^-n) / r)
    const monthlyRate = (interestRate / 100) / 12;
    const loanTerm = 30 * 12; // 30 years in months

    const borrowingCapacity = maxMonthlyRepayment * ((1 - Math.pow(1 + monthlyRate, -loanTerm)) / monthlyRate);

    document.getElementById('borrowingValue').textContent = formatCurrency(borrowingCapacity);
    document.getElementById('borrowingResult').style.display = 'block';

    // Smooth scroll to result
    scrollToResult('borrowingResult');
}

function calculateTaxRate(annualIncome) {
    // Australian tax brackets 2023-24 (simplified)
    if (annualIncome <= 18200) return 0;
    if (annualIncome <= 45000) return 0.19;
    if (annualIncome <= 120000) return 0.26;
    if (annualIncome <= 180000) return 0.32;
    return 0.37;
}

// ==========================================
// LOAN REPAYMENT CALCULATOR
// ==========================================
function calculateRepayment() {
    const loanAmount = parseFloat(document.getElementById('loanAmount').value) || 0;
    const loanTerm = parseInt(document.getElementById('loanTerm').value) || 30;
    const interestRate = parseFloat(document.getElementById('repaymentRate').value) || 6.5;
    const repaymentType = document.getElementById('repaymentType').value;

    const monthlyRate = (interestRate / 100) / 12;
    const totalPayments = loanTerm * 12;

    let monthlyRepayment;
    let totalInterest;

    if (repaymentType === 'io') {
        // Interest Only
        monthlyRepayment = loanAmount * monthlyRate;
        totalInterest = monthlyRepayment * totalPayments;
    } else {
        // Principal & Interest
        // M = P × (r(1+r)^n) / ((1+r)^n - 1)
        if (monthlyRate === 0) {
            monthlyRepayment = loanAmount / totalPayments;
        } else {
            monthlyRepayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
        }
        totalInterest = (monthlyRepayment * totalPayments) - loanAmount;
    }

    const fortnightlyRepayment = monthlyRepayment / 2;
    const weeklyRepayment = monthlyRepayment / 4;

    document.getElementById('monthlyRepayment').textContent = formatCurrency(monthlyRepayment);
    document.getElementById('fortnightlyRepayment').textContent = formatCurrency(fortnightlyRepayment);
    document.getElementById('weeklyRepayment').textContent = formatCurrency(weeklyRepayment);
    document.getElementById('totalInterest').textContent = formatCurrency(totalInterest);
    document.getElementById('repaymentResult').style.display = 'block';

    scrollToResult('repaymentResult');
}

// ==========================================
// STAMP DUTY CALCULATOR
// ==========================================
function calculateStampDuty() {
    const propertyValue = parseFloat(document.getElementById('propertyValue').value) || 0;
    const state = document.getElementById('state').value;
    const buyerType = document.getElementById('buyerType').value;
    const propertyType = document.getElementById('propertyType').value;

    let stampDuty = 0;
    let transferFee = 0;

    // Calculate stamp duty based on state (Victorian rates as primary)
    switch (state) {
        case 'VIC':
            stampDuty = calculateVICStampDuty(propertyValue, buyerType);
            transferFee = 1530; // Approximate transfer fee
            break;
        case 'NSW':
            stampDuty = calculateNSWStampDuty(propertyValue, buyerType);
            transferFee = 338.20;
            break;
        case 'QLD':
            stampDuty = calculateQLDStampDuty(propertyValue, buyerType);
            transferFee = 1390;
            break;
        case 'WA':
            stampDuty = calculateWAStampDuty(propertyValue, buyerType);
            transferFee = 420;
            break;
        case 'SA':
            stampDuty = calculateSAStampDuty(propertyValue, buyerType);
            transferFee = 2525;
            break;
        case 'TAS':
            stampDuty = calculateTASStampDuty(propertyValue, buyerType);
            transferFee = 241;
            break;
        case 'ACT':
            stampDuty = calculateACTStampDuty(propertyValue, buyerType);
            transferFee = 410;
            break;
        case 'NT':
            stampDuty = calculateNTStampDuty(propertyValue, buyerType);
            transferFee = 1150;
            break;
        default:
            stampDuty = propertyValue * 0.055; // Default 5.5%
    }

    document.getElementById('stampDutyValue').textContent = formatCurrency(stampDuty);
    document.getElementById('transferFee').textContent = formatCurrency(transferFee);
    document.getElementById('stampDutyResult').style.display = 'block';

    scrollToResult('stampDutyResult');
}

// Victorian Stamp Duty Rates (2024)
function calculateVICStampDuty(value, buyerType) {
    let duty = 0;

    // First Home Buyer concessions
    if (buyerType === 'fhb') {
        if (value <= 600000) return 0; // Full exemption
        if (value <= 750000) {
            // Concession applies
            const concessionRate = (750000 - value) / 150000;
            duty = calculateStandardVICDuty(value) * (1 - concessionRate);
            return duty;
        }
    }

    return calculateStandardVICDuty(value);
}

function calculateStandardVICDuty(value) {
    if (value <= 25000) return value * 0.014;
    if (value <= 130000) return 350 + (value - 25000) * 0.024;
    if (value <= 960000) return 2870 + (value - 130000) * 0.06;
    if (value <= 2000000) return 52670 + (value - 960000) * 0.055;
    return 110000 + (value - 2000000) * 0.065;
}

// NSW Stamp Duty
function calculateNSWStampDuty(value, buyerType) {
    if (buyerType === 'fhb') {
        if (value <= 800000) return 0;
        if (value <= 1000000) {
            return calculateStandardNSWDuty(value) * ((value - 800000) / 200000);
        }
    }
    return calculateStandardNSWDuty(value);
}

function calculateStandardNSWDuty(value) {
    if (value <= 16000) return value * 0.0125;
    if (value <= 35000) return 200 + (value - 16000) * 0.015;
    if (value <= 93000) return 485 + (value - 35000) * 0.0175;
    if (value <= 351000) return 1500 + (value - 93000) * 0.035;
    if (value <= 1168000) return 10530 + (value - 351000) * 0.045;
    return 47295 + (value - 1168000) * 0.055;
}

// QLD Stamp Duty
function calculateQLDStampDuty(value, buyerType) {
    if (buyerType === 'fhb' && value <= 700000) {
        return calculateStandardQLDDuty(value) * 0.5; // 50% concession
    }
    return calculateStandardQLDDuty(value);
}

function calculateStandardQLDDuty(value) {
    if (value <= 5000) return 0;
    if (value <= 75000) return (value - 5000) * 0.015;
    if (value <= 540000) return 1050 + (value - 75000) * 0.035;
    if (value <= 1000000) return 17325 + (value - 540000) * 0.045;
    return 38025 + (value - 1000000) * 0.0575;
}

// WA Stamp Duty
function calculateWAStampDuty(value, buyerType) {
    if (buyerType === 'fhb' && value <= 530000) return 0;
    return calculateStandardWADuty(value);
}

function calculateStandardWADuty(value) {
    if (value <= 120000) return value * 0.019;
    if (value <= 150000) return 2280 + (value - 120000) * 0.0285;
    if (value <= 360000) return 3135 + (value - 150000) * 0.038;
    if (value <= 725000) return 11115 + (value - 360000) * 0.0475;
    return 28453 + (value - 725000) * 0.0515;
}

// SA Stamp Duty
function calculateSAStampDuty(value, buyerType) {
    if (value <= 12000) return value * 0.01;
    if (value <= 30000) return 120 + (value - 12000) * 0.02;
    if (value <= 50000) return 480 + (value - 30000) * 0.03;
    if (value <= 100000) return 1080 + (value - 50000) * 0.035;
    if (value <= 200000) return 2830 + (value - 100000) * 0.04;
    if (value <= 250000) return 6830 + (value - 200000) * 0.045;
    if (value <= 300000) return 9080 + (value - 250000) * 0.05;
    if (value <= 500000) return 11580 + (value - 300000) * 0.055;
    return 21980 + (value - 500000) * 0.055;
}

// TAS Stamp Duty
function calculateTASStampDuty(value, buyerType) {
    if (value <= 3000) return 50;
    if (value <= 25000) return 50 + (value - 3000) * 0.0175;
    if (value <= 75000) return 435 + (value - 25000) * 0.0225;
    if (value <= 200000) return 1560 + (value - 75000) * 0.035;
    if (value <= 375000) return 5935 + (value - 200000) * 0.04;
    if (value <= 725000) return 12935 + (value - 375000) * 0.0425;
    return 27810 + (value - 725000) * 0.045;
}

// ACT Stamp Duty
function calculateACTStampDuty(value, buyerType) {
    if (value <= 260000) return value * 0.012;
    if (value <= 300000) return 3120 + (value - 260000) * 0.0224;
    if (value <= 500000) return 4016 + (value - 300000) * 0.0349;
    if (value <= 750000) return 10996 + (value - 500000) * 0.0415;
    if (value <= 1000000) return 21371 + (value - 750000) * 0.0515;
    if (value <= 1455000) return 34246 + (value - 1000000) * 0.0565;
    return 59954 + (value - 1455000) * 0.0449;
}

// NT Stamp Duty
function calculateNTStampDuty(value, buyerType) {
    if (value <= 525000) return value * 0.0295;
    if (value <= 3000000) {
        const base = 15487.5 + (value - 525000) * 0.0495;
        return Math.min(base, value * 0.0495);
    }
    return value * 0.0595;
}

// ==========================================
// EXTRA REPAYMENT CALCULATOR
// ==========================================
function calculateExtraRepayment() {
    const currentBalance = parseFloat(document.getElementById('currentBalance').value) || 0;
    const remainingTerm = parseInt(document.getElementById('remainingTerm').value) || 25;
    const currentRate = parseFloat(document.getElementById('currentRate').value) || 6.5;
    const extraPayment = parseFloat(document.getElementById('extraPayment').value) || 0;

    const monthlyRate = (currentRate / 100) / 12;
    const totalMonths = remainingTerm * 12;

    // Calculate original monthly repayment
    const originalMonthly = currentBalance * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);

    // Calculate total interest without extra payments
    const totalOriginalInterest = (originalMonthly * totalMonths) - currentBalance;

    // Calculate new scenario with extra payments
    const newMonthlyPayment = originalMonthly + extraPayment;

    // Calculate new loan term
    let newTermMonths = 0;
    let balance = currentBalance;
    let totalNewInterest = 0;

    while (balance > 0 && newTermMonths < totalMonths) {
        const monthlyInterest = balance * monthlyRate;
        totalNewInterest += monthlyInterest;
        const principalPaid = newMonthlyPayment - monthlyInterest;

        if (principalPaid <= 0) {
            // Payment doesn't cover interest
            break;
        }

        balance -= principalPaid;
        newTermMonths++;
    }

    // Calculate savings
    const interestSaved = totalOriginalInterest - totalNewInterest;
    const monthsSaved = totalMonths - newTermMonths;
    const yearsSaved = Math.floor(monthsSaved / 12);
    const remainingMonthsSaved = monthsSaved % 12;

    // Format time saved
    let timeSavedText = '';
    if (yearsSaved > 0) {
        timeSavedText = `${yearsSaved} yr${yearsSaved > 1 ? 's' : ''}`;
        if (remainingMonthsSaved > 0) {
            timeSavedText += ` ${remainingMonthsSaved} mo`;
        }
    } else {
        timeSavedText = `${remainingMonthsSaved} months`;
    }

    // Calculate new loan term in years
    const newTermYears = newTermMonths / 12;
    let newTermText = '';
    if (newTermYears >= 1) {
        const years = Math.floor(newTermYears);
        const months = Math.round((newTermYears - years) * 12);
        newTermText = `${years} yr${years > 1 ? 's' : ''}`;
        if (months > 0) {
            newTermText += ` ${months} mo`;
        }
    } else {
        newTermText = `${Math.round(newTermMonths)} months`;
    }

    document.getElementById('interestSaved').textContent = formatCurrency(interestSaved);
    document.getElementById('timeSaved').textContent = timeSavedText;
    document.getElementById('newLoanTerm').textContent = newTermText;
    document.getElementById('newMonthlyPayment').textContent = formatCurrency(newMonthlyPayment);
    document.getElementById('extraRepaymentResult').style.display = 'block';

    scrollToResult('extraRepaymentResult');
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function formatCurrency(amount) {
    if (isNaN(amount) || amount < 0) {
        return '$    0';
    }
    return '$    ' + Math.round(amount).toLocaleString('en-AU');
}

function scrollToResult(resultId) {
    const resultElement = document.getElementById(resultId);
    if (resultElement) {
        resultElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ==========================================
// KEYBOARD SUPPORT
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    // Allow Enter key to submit forms
    const calcForms = document.querySelectorAll('.calc-form');
    calcForms.forEach(form => {
        form.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const button = form.querySelector('button[type="button"]');
                if (button) {
                    button.click();
                }
            }
        });
    });

    // Format input fields on blur
    const currencyInputs = document.querySelectorAll('.input-icon input[type="number"]');
    currencyInputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.select();
        });
    });
});
