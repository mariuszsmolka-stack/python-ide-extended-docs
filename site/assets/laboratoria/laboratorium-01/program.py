import ms2d

# Funkcja zdefiniowana samodzielnie.
def parabola_w_dol(x):
    return -x**2

funkcje = [
    ms2d.parabola(a=1, b=0, c=0),
    lambda x: 2 * x**2,
    lambda x: (x + 2)**2,
    ms2d.parabola(a=1, b=-4, c=0),
    parabola_w_dol,
    ms2d.parabola(a=-1, b=-4, c=3),
]

for krok in range(1, 7):
    if krok > 1:
        input("Naciśnij Enter, aby zobaczyć kolejny etap...")
    print("Etap", krok, "z 6")
    rysuj(*funkcje[:krok])
