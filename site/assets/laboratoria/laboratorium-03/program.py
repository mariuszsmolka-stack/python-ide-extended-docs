import math

def podstawowa(x):
    return math.sin(x)

wyzsza = lambda x: 2 * math.sin(x)
czestsza = lambda x: math.sin(2 * x)

rysuj(podstawowa, wyzsza, czestsza)
