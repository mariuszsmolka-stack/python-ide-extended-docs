import ms2d

def parabola_w_dol(x):
    return -x**2

f1 = ms2d.parabola(a=1, b=0, c=0)
f2 = lambda x: 2 * x**2
f3 = lambda x: (x + 2)**2
f4 = ms2d.parabola(a=1, b=-4, c=0)
f5 = parabola_w_dol
f6 = ms2d.parabola(a=-1, b=-4, c=3)

rysuj(f1)
input("Enter: wykres 2")

rysuj(f2)
input("Enter: wykres 3")

rysuj(f3)
input("Enter: wykres 4")

rysuj(f4)
input("Enter: wykres 5")

rysuj(f5)
input("Enter: wykres 6")

rysuj(f6)
input("Enter: porownaj wszystkie")

rysuj(f1, f2, f3, f4, f5, f6)
